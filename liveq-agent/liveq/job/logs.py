
class JobLogger:

	"""
	Log different types of messages
	"""
	def debug(self, text):
		self.write(text, "Debug")
	def warn(self, text):
		self.write(text, "Warn")
	def error(self, text):
		self.write(text, "Error")

	"""
	Log an arbitrary message to the logger
	"""
	def write(self, text, class="Message"):
		pass

	"""
	Import loglines from the given filename
	"""
	def importFile(self,filename):
		pass