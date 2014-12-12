#!/usr/bin/python
################################################################
# LiveQ - An interactive volunteering computing batch system
# Copyright (C) 2013 Ioannis Charalampidis
# 
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
################################################################

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import logging
import time
import signal
import sys
import hashlib
import uuid

from config import Config

import liveq.data.histo.io as io

from liveq.models import Lab, Observables, TunableToObservable
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from liveq import handleSIGINT, exit
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException
from liveq.component import Component

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
    Config.fromFile( "config.local", runtimeConfig )
except ConfigException as e:
    print("Configuration exception: %s" % e)
    exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

class JobDumperComponent(Component):

    def abortJob(self):
        """
        Abort a previously started job
        """

        # Make sure we have a job
        if not self.jobid:
            return

        # Send status
        self.logger.info("Aborting previous job")

        # Ask job manager to cancel a job
        ans = self.jobChannel.send('job_cancel', {
            'jid': self.jobid
        }, waitReply=True)

        # Check for I/O failure on the bus
        if not ans:
            self.logger.error("Unable to contact the job manager")
            return

        # Check for error response
        if ans['result'] == 'error':
            self.logger.error("Unable to cancel job: %s" % ans['error'])
            return

        # Send status
        self.logger.info("Job aborted")

        # Clear job ID
        self.jobid = None

    def startJob(self, prefix, param={}):
        """
        """

        # If we are already running a tune (jobid is defined), cancel and restart
        self.abortJob()

        # Format user tunables
        tunables = self.lab.formatTunables( param )

        # Send status
        self.logger.info("Contacting job manager")

        # Ask job manager to schedule a new job
        ans = self.jobChannel.send('job_start', {
            'lab': self.lab.uuid,
            'group': 'global',
            'dataChannel': self.dataChannel.name,
            'parameters': tunables
        }, waitReply=True, timeout=5)

        # Check for I/O failure on the bus
        if not ans:
            self.logger.error("Unable to contact the job manager")
            return

        # Check for error response
        if ans['result'] == 'error':
            self.logger.error("Unable to place a job request: %s" % ans['error'])
            return

        # Send status
        self.logger.info("Job #%s started" % ans['jid'])

        # The job started, save the tune job ID
        self.jobid = ans['jid']
        self.prefix = prefix


    def run(self):
        """
        Bind setup
        """

        # Reset local properties
        self.jobid = None
        self.histoID = 0
        self.prefix = ""

        # Open lab
        try:
            #self.lab = Lab.get(Lab.uuid == "3eb1263a77f35ba11d334cc8e29fc0c3")
            self.lab = Lab.get(Lab.uuid == "3e63661c13854de7a9bdeed71be16bb9")
        except Lab.DoesNotExist:
            self.logger.error("Unable to locate lab with id '%s'" % labid)
            return

        # Open logger
        self.logger = logging.getLogger("job-dumper")

        # Open channels
        self.jobChannel = Config.IBUS.openChannel("jobs")
        self.dataChannel = Config.IBUS.openChannel("data-%s" % uuid.uuid4().hex, serve=True)

        # Bind events
        self.dataChannel.on('job_data', self.onBusData)
        self.dataChannel.on('job_status', self.onBusStatus)
        self.dataChannel.on('job_completed', self.onBusCompleted)

        # Interrupt on shutdown
        GlobalEvents.System.on('shutdown', self.abortJob)

        # Start job
        """
        self.startJob("bad", {
                "TimeShower:alphaSvalue": 1.0,
                "StringZ:aLund": 0.8,
                "StringZ:bLund": 0.3
            })
        self.startJob("good", {
                "TimeShower:alphaSvalue": 0.1383,
                "StringZ:aLund": 0.3,
                "StringZ:bLund": 0.8
            })
        self.startJob("partial", {
                "TimeShower:alphaSvalue": 0.12
            })
        """
        self.startJob("good_long", {
                "TimeShower:alphaSvalue": 0.1383,
                "StringZ:aLund": 0.3,
                "StringZ:bLund": 0.8
            })

        # Run component
        Component.run(self)

    ####################################################################################
    # --------------------------------------------------------------------------------
    #                                BUS CALLBACK HANDLERS
    # --------------------------------------------------------------------------------
    ####################################################################################

    def onBusData(self, data):
        """
        [Bus Event] Data available
        """

        # If we have no job, ignore
        if not self.jobid:
            return

        # Log
        self.histoID += 1
        self.logger.info("Histogram %04i dumped" % self.histoID)

        # Dump incoming packed data to the file
        with open("histogram/%s-%04i.dat" % (self.prefix, self.histoID), "w") as f:
            f.write(data['data'])

    def onBusCompleted(self, data):
        """
        [Bus Event] Simulation completed
        """

        # If we have no job, ignore
        if not self.jobid:
            return

        # Forward event to the user socket
        self.logger.info("Simulation completed")

        # Reset tune
        self.jobid = None

    def onBusStatus(self, data):
        """
        [Bus Status] Forward bus message 
        """

        # If we have no job, ignore
        if not self.jobid:
            return

        # Extract parameters
        pMessage = ""
        if 'message' in data:
            pMessage = data['message']
        pVars = { }
        if 'vars' in data:
            pVars = data['vars']

        # Forward the status message
        self.logger.info(pMessage)

JobDumperComponent.runThreaded()
