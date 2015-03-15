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

import logging

from math import *
from liveq.config import ComponentClassConfig, configexceptions

class TuneAddressingConfig(ComponentClassConfig):
	"""
	A configuration class that can be used by the config parser
	to fine-tune each tuning parameter.
	"""

	#: The global tune precision configuration
	TUNE_CONFIG = { }

	#: Default value for the tune precision
	TUNE_DEFAULT_DECIMALS = 2

	#: The default tune for the tune rounding
	TUNE_DEFAULT_ROUND = 1.0

	#: Tune parameter normalizer
	TUNE_NORMALIZER = { }

	@staticmethod
	def normalizeParameter(name, value):
		"""
		Normalize the specified parameter according to the
		configuration.
		"""

		# If there is no normalized in TUNE_NORMALIZER, use
		# the default pass-through
		if not name in TuneAddressingConfig.TUNE_NORMALIZER:
			return value

		# Otherwise, use the mapping function
		norm = TuneAddressingConfig.TUNE_NORMALIZER[name]
		return norm(value)

	@staticmethod
	@configexceptions(section="parameter-index")
	def fromConfig(config, runtimeConfig):
		"""
		Update class variables by reading the config file
		contents of the specified config object
		"""

		# Reset maps
		TuneAddressingConfig.TUNE_CONFIG = { }
		TuneAddressingConfig.TUNE_NORMALIZER = { }

		# Get normalizing functions
		if "parameter-normalizers" in config._sections:
			normalizers = config._sections["parameter-normalizers"]

			# Populate classes
			for k,v in normalizers.iteritems():

				# Replace '/' with ':'
				k = k.replace('/', ':')

				# Skip some defaults
				if k in ("__name__",):
					pass

				else:
					try:
						# Compile and store normalizer function
						TuneAddressingConfig.TUNE_NORMALIZER[k] = eval("lambda x: %s" % v)
						logging.info("Using expression '%s' for normalizing %s" % (v,k))

					except:
						# Catch compilation exceptions
						logging.warn("Unable to compile expression '%s' for '%s' normalizer!" % (v,k))
						continue
		
		# Get default variables
		config = config._sections["parameter-index"]
		if "round-default" in config:
			TuneAddressingConfig.TUNE_DEFAULT_ROUND = float(config['round-default'])
		if "decimals-default" in config:
			TuneAddressingConfig.TUNE_DEFAULT_DECIMALS = int(config['decimals-default'])

		# Populate classes
		for k,v in config.iteritems():

			# Start processing keys
			if k in ("round-default", "decimals-default", "__name__"):
				# Skip processed keys
				pass

			else:

				# Split name and kind
				nk = k.split("-",1)

				# Sanitize
				if len(nk) == 1:
					logging.warn("Unexpected parameter '%s' in parameter-index section!" % nk)
					continue

				# Store the rest on the tune config
				if not nk[1] in TuneAddressingConfig.TUNE_CONFIG:
					# Prepare new entries
					TuneAddressingConfig.TUNE_CONFIG[nk[1]] = {
						'round': TuneAddressingConfig.TUNE_DEFAULT_ROUND,
						'decimals': TuneAddressingConfig.TUNE_DEFAULT_DECIMALS,
						'alias' : nk[1]
					}

				# Update variables
				if nk[0] == 'round':
					TuneAddressingConfig.TUNE_CONFIG[nk[1]]['round'] = float(v)
				elif nk[0] == 'decimals':
					TuneAddressingConfig.TUNE_CONFIG[nk[1]]['decimals'] = int(v)
				elif nk[0] == 'alias':
					logging.info("Using index '%s' for parameter %s" % (v,nk[1]))
					TuneAddressingConfig.TUNE_CONFIG[nk[1]]['alias'] = v

