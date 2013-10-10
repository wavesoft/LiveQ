
"""
Job template that is overloaded by each job
"""
class JobApplication:

	"""
	Launch application binaries
	"""
	def start(self):
		pass

	"""
	Kill all instances
	"""
	def kill(self):
		pass

	"""
	Reload configuration (this might mean restarting the simulation)
	"""
	def reload(self):
		pass

	"""
	Set/Update configuration files
	"""
	def setConfig(self,config):
		pass

"""
Application manager that creates JobApplicationInstances
"""
class JobApplicationManager:

	"""
	Instantiate an application
	"""
	def instantiate(self,logger,results):

		inst = JobApplicationInstance()
		pass

