
This is the template sent to users upon password reset.

===SUBJECT===

Virtual Atom Smasher - Password Reset

===TEXT===

Dear %(displayName)s,

you have requested a password reset for your account. You will need the following one-time 
pin number in order to complete this process.

Your PIN number is: %(pin)s

===HTML===

<html lang="en">
	<head></head>
	<body>
		<p>Dear %(displayName)s,</p>
		<p>you have requested a password reset for your account. You will need the following one-time 
		   pin number in order to complete this process.
		</p>
		<p>
			<div>Your PIN number is:</div>
			<div style="font-size: 24px">%(pin)s</div>
		</p>
	</body>
</html>
