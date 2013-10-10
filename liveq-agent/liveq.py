import sys
import xmpp
from liveq.config import Config

def messageCB(conn,mess):
    text=mess.getBody()
    user=mess.getFrom()
    print "[%s]: %s\n" % (user, text)
    conn.send(xmpp.Message(mess.getFrom(),"You just said '%s'" % text))

def StepOn(conn):
    try:
        conn.Process(1)
    except KeyboardInterrupt: return 0
    return 1

def GoOn(conn):
    while StepOn(conn): pass

# Connect to the given XMPP Server
conn=xmpp.Client(Config.XMPP_SERVER)#,debug=[])
conres=conn.connect()
if not conres:
    print "Unable to connect to server %s!"% Config.XMPP_SERVER
    sys.exit(1)
if conres<>'tls':
    print "Warning: unable to estabilish secure connection - TLS failed!"
authres=conn.auth( Config.XMPP_USERNAME, Config.XMPP_PASSWORD, Config.XMPP_RESOURCE)
if not authres:
    print "Unable to authorize on %s - check login/password."% Config.XMPP_SERVER
    sys.exit(1)
if authres<>'sasl':
    print "Warning: unable to perform SASL auth os %s. Old authentication method used!"% Config.XMPP_SERVER
conn.RegisterHandler('message',messageCB)
conn.sendInitPresence()
print "Bot started."
GoOn(conn)