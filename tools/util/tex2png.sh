#!/bin/bash
################################################################
# LiveQ - An interactive volunteering computing batch system
# Copyright (C) 2013 Ioannis Charalampidis
# 
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
################################################################

TEX_STRING="$1"
if [ -z "$1" ]; then
	echo "Please specify TeX string to compile"
	exit 1
fi

TEX_IMAGE="$2"
if [ -z "$2" ]; then
	echo "Please specify the output format"
	exit 1
fi

cat <<EOF > temp-formula.tex
\nonstopmode
\documentclass[border=1pt]{standalone}
\usepackage{amsmath}
\usepackage{varwidth}
\begin{document}
\begin{varwidth}{\linewidth}
${TEX_STRING}
\end{varwidth}
\end{document}
EOF

# Conver to PDF
pdflatex "\input{temp-formula.tex}" > /dev/null
if [ $? -ne 0 ]; then
	echo "-- Error --"
	exit 1
fi

# And then to image
#convert -density 400 temp-formula.pdf -resize 1000x${TEX_HEIGHT} ${TEX_IMAGE}
#convert -trim temp-formula.pdf -sharpen 0x1.0 ${TEX_IMAGE}
convert -trim -density 90 temp-formula.pdf -sharpen 0x1 ${TEX_IMAGE}

# Cleanup
rm temp-formula.*
