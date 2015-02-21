#!/bin/bash

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
