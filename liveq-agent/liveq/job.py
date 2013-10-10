from job.app import JobApplication
from job.parameters import JobParameters
from job.results import JobResults
from job.logs import JobLogger

class Job:

	"""
	Job constructor
	"""
	def __init__(self,app,cfg):
		self.app = app
		self.config = cfg
		self.instance = None
		self.logger = JobLogger()
		self.results = JobResults()

	"""
	Start the simulation with the given parameter set
	"""
	def start(self):

		# Instantiate the given application configuration
		self.instance = self.app.instantiate(self.logger, self.results)

		# Set the config
		self.instance.setConfig( self.config.render() )

		# Start the job
		self.instance.start()

	"""
	Abort a running job
	"""
	def stop(self):
		
		# Kill the instance
		self.instance.kill()

	"""
	Callback from the application
	"""
	def update(self, cfg):

		# Update config
		self.config = cfg

		# Commit changes and reload config
		self.instance.setConfig( self.config.render() )
		self.instance.reload()
