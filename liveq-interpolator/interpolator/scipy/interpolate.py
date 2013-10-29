"""rbf - Radial basis functions for interpolation/smoothing scattered Nd data.

Written by John Travers <jtravs@gmail.com>, February 2007
Based closely on Matlab code by Alex Chirokov
Additional, large, improvements by Robert Hetland
Some additional alterations by Travis Oliphant

Permission to use, modify, and distribute this software is given under the
terms of the SciPy (BSD style) license.  See LICENSE.txt that came with
this distribution for specifics.

NO WARRANTY IS EXPRESSED OR IMPLIED.  USE AT YOUR OWN RISK.

Copyright (c) 2006-2007, Robert Hetland <hetland@tamu.edu>
Copyright (c) 2007, John Travers <jtravs@gmail.com>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

	* Redistributions of source code must retain the above copyright
	   notice, this list of conditions and the following disclaimer.

	* Redistributions in binary form must reproduce the above
	   copyright notice, this list of conditions and the following
	   disclaimer in the documentation and/or other materials provided
	   with the distribution.

	* Neither the name of Robert Hetland nor the names of any
	   contributors may be used to endorse or promote products derived
	   from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
"""
from __future__ import division, print_function, absolute_import

import sys

from numpy import (sqrt, log, asarray, array, newaxis, all, dot, exp, eye,
				   float_, zeros, swapaxes)
from numpy import linalg
from interpolator.scipy.lib.six import callable, get_method_function, \
	 get_function_code

from liveq.data.histo import HistogramCollection, Histogram

__all__ = ['Rbf']


class Rbf(object):
	"""
	Rbf(*args)

	A class for radial basis function approximation/interpolation of
	n-dimensional scattered data.

	Parameters
	----------
	*args : arrays
		x, y, z, ..., d, where x, y, z, ... are the coordinates of the nodes
		and d is the array of values at the nodes
	function : str or callable, optional
		The radial basis function, based on the radius, r, given by the norm
		(default is Euclidean distance); the default is 'multiquadric'::

			'multiquadric': sqrt((r/self.epsilon)**2 + 1)
			'inverse': 1.0/sqrt((r/self.epsilon)**2 + 1)
			'gaussian': exp(-(r/self.epsilon)**2)
			'linear': r
			'cubic': r**3
			'quintic': r**5
			'thin_plate': r**2 * log(r)

		If callable, then it must take 2 arguments (self, r).  The epsilon
		parameter will be available as self.epsilon.  Other keyword
		arguments passed in will be available as well.

	epsilon : float, optional
		Adjustable constant for gaussian or multiquadrics functions
		- defaults to approximate average distance between nodes (which is
		a good start).
	smooth : float, optional
		Values greater than zero increase the smoothness of the
		approximation.  0 is for interpolation (default), the function will
		always go through the nodal points in this case.
	norm : callable, optional
		A function that returns the 'distance' between two points, with
		inputs as arrays of positions (x, y, z, ...), and an output as an
		array of distance.  E.g, the default::

			def euclidean_norm(x1, x2):
				return sqrt( ((x1 - x2)**2).sum(axis=0) )

		which is called with x1=x1[ndims,newaxis,:] and
		x2=x2[ndims,:,newaxis] such that the result is a matrix of the
		distances from each point in x1 to each point in x2.

	Examples
	--------
	>>> rbfi = Rbf(x, y, z, d)  # radial basis function interpolator instance
	>>> di = rbfi(xi, yi, zi)   # interpolated values

	"""

	DATA_SINGLE = 1
	DATA_HISTOGRAM = 2

	def _euclidean_norm(self, x1, x2):
		return sqrt(((x1 - x2)**2).sum(axis=0))

	def _h_multiquadric(self, r):
		return sqrt((1.0/self.epsilon*r)**2 + 1)

	def _h_inverse_multiquadric(self, r):
		return 1.0/sqrt((1.0/self.epsilon*r)**2 + 1)

	def _h_gaussian(self, r):
		return exp(-(1.0/self.epsilon*r)**2)

	def _h_linear(self, r):
		return r

	def _h_cubic(self, r):
		return r**3

	def _h_quintic(self, r):
		return r**5

	def _h_thin_plate(self, r):
		result = r**2 * log(r)
		result[r == 0] = 0  # the spline is zero at zero
		return result

	# Setup self._function and do smoke test on initial r
	def _init_function(self, r):
		if isinstance(self.function, str):
			self.function = self.function.lower()
			_mapped = {'inverse': 'inverse_multiquadric',
					   'inverse multiquadric': 'inverse_multiquadric',
					   'thin-plate': 'thin_plate'}
			if self.function in _mapped:
				self.function = _mapped[self.function]

			func_name = "_h_" + self.function
			if hasattr(self, func_name):
				self._function = getattr(self, func_name)
			else:
				functionlist = [x[3:] for x in dir(self) if x.startswith('_h_')]
				raise ValueError("function must be a callable or one of " +
									 ", ".join(functionlist))
			self._function = getattr(self, "_h_"+self.function)
		elif callable(self.function):
			allow_one = False
			if hasattr(self.function, 'func_code') or \
				   hasattr(self.function, '__code__'):
				val = self.function
				allow_one = True
			elif hasattr(self.function, "im_func"):
				val = get_method_function(self.function)
			elif hasattr(self.function, "__call__"):
				val = get_method_function(self.function.__call__)
			else:
				raise ValueError("Cannot determine number of arguments to function")

			argcount = get_function_code(val).co_argcount
			if allow_one and argcount == 1:
				self._function = self.function
			elif argcount == 2:
				if sys.version_info[0] >= 3:
					self._function = self.function.__get__(self, Rbf)
				else:
					import new
					self._function = new.instancemethod(self.function, self,
														Rbf)
			else:
				raise ValueError("Function argument must take 1 or 2 arguments.")

		a0 = self._function(r)
		if a0.shape != r.shape:
			raise ValueError("Callable must take array and return array of the same shape")
		return a0

	def __init__(self, *args, **kwargs):

		# Pop data entry
		data = kwargs.pop('data')
		if not data:
			raise ValueError("data= kwargument was not specified!")

		# Process arguments
		self.xi = asarray([asarray(a, dtype=float_).flatten()
						   for a in args])
		self.N = self.xi.shape[-1]

		# Check if the user specified an array of HistogramCollection
		# as an interpolating value. In that case perform interpolation
		# in multiple levels
		if data[0].__class__ is HistogramCollection:

			# Set interpolation mode
			self.ipolmode = Rbf.DATA_HISTOGRAM
			self._histobins = data[0].bins

			# Make di array and swap axes
			# TODO: Try to skip python loop (use only numpy)
			self.di = swapaxes(array( [h.data for h in data] ), 0, 1)

			if not all([x.size == len(data) for x in self.xi]):
					raise ValueError("All arrays must be equal length.")

		else:
			self.di = asarray(data).flatten()
			self.ipolmode = Rbf.DATA_SINGLE

			if not all([x.size == self.di.size for x in self.xi]):
				raise ValueError("All arrays must be equal length.")

		self.norm = kwargs.pop('norm', self._euclidean_norm)
		r = self._call_norm(self.xi, self.xi)
		self.epsilon = kwargs.pop('epsilon', None)
		if self.epsilon is None:
			self.epsilon = r.mean()
		self.smooth = kwargs.pop('smooth', 0.0)

		self.function = kwargs.pop('function', 'multiquadric')

		# attach anything left in kwargs to self
		#  for use by any user-callable function or
		#  to save on the object returned.
		for item, value in kwargs.items():
			setattr(self, item, value)

		self.A = self._init_function(r) - eye(self.N)*self.smooth

		if self.ipolmode == Rbf.DATA_SINGLE:
			# In single interpolation, create single node
			self.nodes = linalg.solve(self.A, self.di)

		else:
			# In any other cases, create a node array
			self.nodes = []
			for di in self.di:
				self.nodes.append( linalg.solve(self.A, di) )


	def _call_norm(self, x1, x2):
		if len(x1.shape) == 1:
			x1 = x1[newaxis, :]
		if len(x2.shape) == 1:
			x2 = x2[newaxis, :]
		x1 = x1[..., :, newaxis]
		x2 = x2[..., newaxis, :]
		return self.norm(x1, x2)

	def __call__(self, *args):
		args = [asarray(x) for x in args]
		if not all([x.shape == y.shape for x in args for y in args]):
			raise ValueError("Array lengths must be equal")
		shp = args[0].shape
		self.xa = asarray([a.flatten() for a in args], dtype=float_)
		r = self._call_norm(self.xa, self.xi)

		if self.ipolmode == Rbf.DATA_SINGLE:
			# Single interpolation
			return dot(self._function(r), self.nodes).reshape(shp)

		elif self.ipolmode == Rbf.DATA_HISTOGRAM:
			# Histogram interpolation and re-generation
			ans = zeros( len(self.nodes) )
			i = 0
			for node in self.nodes:
				ans[i] = dot(self._function(r), node).reshape(shp)
				i += 1

			# Create and return a new histogram object
			return HistogramCollection(data=ans, bins=self._histobins)
