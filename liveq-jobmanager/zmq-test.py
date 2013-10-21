import zmq

c = zmq.Context()
s = c.socket(zmq.REQ)
s.connect("tcp://127.0.0.1:10011")
s.send_json({"name":"action","data":{"payload":"stuffs are stored here"}})

ans = s.recv_json()
print("Got response: %s" % str(ans))

