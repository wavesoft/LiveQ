
# LiveQ

LiveQ is a job distribution and monitoring framework with real-time feedback, control and full network awareness. The framework is modular and designed to be fully scalable.

## Architecture

![LiveQ Architecture](/doc/img/architecture.png?raw=true "LiveQ Architecture")

## Installing LiveQ Framework for Virtual Atom Smasher

Installing the `LiveQ` Framework in order to run for the Virtual Atom Smasher game is a quite complicated process through many steps. Please make sure you follow these steps in order otherwise you might have trouble running the components.

### 1. Installing Services

You will need to have the following services running in your system (locally or in your cluster):

- [RabbitMQ](https://www.rabbitmq.com/download.html)
- [ejabberd](http://docs.ejabberd.im/admin/guide/installation/)
- [Redis](http://redis.io/download)
- MySQL

In addition, on the machines that you will run the `liveq-webserver` component, you will need:

- Apache (or any other webserver)

#### 1.1. Configuring the services

You will also need to prepare the services for use by a `LiveQ`:

- Create two accounts on the `ejabberd` server, one for the agents and one for the managers:

```
ejabberctl register liveq_agent <hostname> <secret>
ejabberctl register liveq_manager <hostname> <secret>
```

- Create two databases on the `MySQL` server, one for the `LiveQ` framework (ex. `liveq`) and one for the MyBB forum that will be embedded in the game interface (ex. `mybb`).
- Create two users on the `MySQL` server and grant them all priviledges on the two databases. 

### 2. Installing Software

On the machines that you are going to run a `LiveQ` agent you are going to need the following software installed:

- Python >= 2.7
- virtualenv 
- pip

First, you need to check-out the latest version of `LiveQ` from github:

```
git clone https://github.com/wavesoft/LiveQ
cd LiveQ
```

Then you will need to create a directory were to keep the reference histograms and the simulation results:

```
mkdir -p data.local/{ref,results}
```

Extract the reference data:

```
cd data.local/ref
tar -jxf ../../schema/ref-data.tbz2
```

Finally, you will need to configure the component you want to use.

#### 2.1. Configuring Job Manager

Copy `liveq-jobmanager/config/jobmanager.conf` to `liveq-jobmanager/config/jobmanager.conf.local` and edit to match your needs:

```
[general]
loglevel=info

[database]
class=liveq.classes.db.mysql
server=				# << Hostname of SQL server
database=			# << Name of the database
username=			# << Name of the SQL User
password=			# << Password of the SQL User

[store]
class=liveq.classes.store.redisdb
server=				# << Hostname of REDIS server
port=6379
db=0

[internal-bus]
class=liveq.classes.bus.amqp
server=				# << Hostname of RabbitMQ server
serve=jobs

[external-bus]
class=liveq.classes.bus.xmppmsg
domain=				# << XMPP Domain (ex. 'test.local')
server=				# << Hostname of the XMPP Server
username=			# << XMPP username (ex. liveq_manager)
password=			# << XMPP user password
resource=			# << XMPP Resource (or '%(random)s' for a random)

[jobmanager]
results_path=		# << Full path to a directory were to keep results
trusted-channels=	# << The XMPP user name of the agent
failure_delay=60
failure_limit=10
failure_retry_delay=86400
min_event_thresshold=1000

[histograms]
path=				# << Full path to reference histogram directory 
default=rivet
```

#### 2.2. Configuring Web Server

Copy `liveq-webserver/config/webserver.conf` to `liveq-webserver/config/webserver.conf.local` and edit to match your needs:

```

[general]
loglevel=info

[internal-bus]
class=liveq.classes.bus.amqp
server=				# << Hostname of RabbitMQ server

[database]
class=liveq.classes.db.mysql
server=				# << Hostname of SQL server
database=			# << Name of the database
username=			# << Name of the SQL User
password=			# << Password of the SQL User

[store]
class=liveq.classes.store.redisdb
server=				# << Hostname of REDIS server
port=6379
db=0

[cache]
class=liveq.classes.cache.couch
url=				# << Not used, leave it empty

[histograms]
path=				# << Full path to reference histogram directory 
default=rivet

[webserver]
port=8080
vas_url=			# << Full URL to the Javascript Interface
trainseq_path=		# << Not used, leave it empty
base_url=			# << Full URL to server root (ex. http://127.0.0.1:8080)
base_path=/vas 		# << Relative URL were to run the game from
ssl=0				# << Set to 1 and fill the rest of the fields for SSL
ssl_port=8043
ssl_certificate=
ssl_key=
ssl_ca=

[forum]
engine=mybb
server=				# << Hostname of SQL server
database=			# << Name of the database that is used by the MyBB forum
username=			# << The username mybb uses to access the database
password=			# << The password for the above user
prefix=mybb_

[game]
default_team=1
exam_cooldown=3600

[email]
class=liveq.classes.mail.sendmail
from=				# << The sender's e-mail addres
sendmail=			# << Full path to the 'sendmail' binary in your system
```

#### 2.3. Configuring Administration Tools

That's perhaps the most important component of all, since it allows you to check the status of the system. Like before, you will need to copy `tools/config/common.conf` to `tools/config/common.conf.local` and edit like before.

The sections are already explained before, so just copy them.

### 3. Running the Services

There is a bootstrap utility that takes care of setting up the environment and running the component. You can use it for example like this:

```
./bootstrap.sh liveq-webserver
```

# License

LiveQ - An interactive volunteering computing batch system

Copyright (C) 2013 Ioannis Charalampidis

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
