import os
import glob
import tempfile
import subprocess
import base64

def wrapExpression(expr):
	"""
	Wrap math expression
	"""
	return "\\nonstopmode\n\\documentclass[border=1pt]{standalone}\n\\usepackage{amsmath}\n" + \
		   "\\usepackage{varwidth}\n\\begin{document}\n\\begin{varwidth}{\\linewidth}\n"+ \
			expr + \
			"\n\\end{varwidth}\n\\end{document}\n"

def toPNG(expr, density=90):
	"""
	Convert the given LaTeX expression to PNG and return
	the image as a base64-encoded stream
	"""

	# Create a temporary file name
	(fid, fname) = tempfile.mkstemp(suffix='.tex')
	fdir = os.path.dirname(fname)

	# Create a document
	os.write(fid, wrapExpression(expr))
	os.close(fid)

	# Wrap for cleaning-up exceptions
	try:

		# Run PDFLaTeX
		try:
			# Open process
			p = subprocess.Popen(["pdflatex", "\\input{%s}" % fname], cwd=fdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			# Get STDOUT/ERR
			(stdoutdata, stderrdata) = p.communicate()
			# Check for errors
			if p.returncode != 0:
				raise IOError("Error parsing LaTeX expression with pdflatex!")
		except OSError as e:
			if e.errno == os.errno.ENOENT:
				raise IOError("pdflatex application not installed!")
			else:
				raise IOError("Could not start a pdflatex process!")

		# Get filenames
		f_pdf = fname[0:-4] + ".pdf"
		f_png = fname[0:-4] + ".png"

		# Run ImageMagic to convert to png
		try:
			# Open process
			p = subprocess.Popen(["convert", "-trim", "-density", str(density), f_pdf, "-sharpen", "0x1", f_png], cwd=fdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			# Get STDOUT/ERR
			(stdoutdata, stderrdata) = p.communicate()
			# Check for errors
			if p.returncode != 0:
				raise IOError("Error converting PDF to PNG!")
		except OSError as e:
			if e.errno == os.errno.ENOENT:
				raise IOError("ImageMagic was not installed!")
			else:
				raise IOError("Could not start a convert process!")

		# Get buffer
		with open(f_png, mode='rb') as f:
			buf = f.read()

		# Return string
		return "data:image/png;base64,%s" % base64.b64encode(buf)

	finally:

		# Remove all junk files
		junk = glob.glob(fname[0:-4] + ".*")
		for f in junk:
			os.unlink(f)

