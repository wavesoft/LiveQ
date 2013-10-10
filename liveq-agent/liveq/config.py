import ConfigParser


class Config:

#	XMPP_SERVER = "t4tc-xmpp-1.cern.ch"
	XMPP_SERVER = "t4t-xmpp.cern.ch"
	XMPP_DOMAIN = "t4t-xmpp.cern.ch"
	XMPP_USERNAME = "liveq"
	XMPP_PASSWORD = "liveq"
	XMPP_RESOURCE = "agent001"

	JOB_CMDLINE = ""

	"""
	Read the actual configuration from the file
	"""
	@staticmethod
	def readFile(self, file):
		config = ConfigParser.ConfigParser()
		config.read(file)
