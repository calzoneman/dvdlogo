#!/bin/bash

set -eo pipefail

colors=(
    "#ff0000" # red
    "#00ff00" # green
    "#ff00ff" # magenta
    "#ff5f00" # orange
    "#00ffff" # cyan
    "#ffff00" # yellow
    "#5555ff" # blue
)
ncolors=${#colors[@]}
lastidx=$(($ncolors - 1))

rm -f www/logos/*.svg
mkdir -p www/logos

for i in `seq 0 $lastidx`; do
    echo "${colors[$i]} -> www/logos/$i.svg"
    (export LOGO_FILL=${colors[$i]}; envsubst '$LOGO_FILL' < logo-template.svg > www/logos/$i.svg)
done
