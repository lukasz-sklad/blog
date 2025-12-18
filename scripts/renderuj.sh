#!/bin/bash

# Zmniejszamy szerokosc do 800px dla testu, zeby bylo widac szczegoly
W=800
H=692

# Wspolrzedne przeliczone dla 800px (TL, TR, BL, BR)
P="x0=221:y0=96:x1=696:y1=269:x2=125:y2=364:x3=599:y3=536:sense=destination"

echo "Generowanie klatki testowej (tylko 1 klatka)..."

ffmpeg -i /home/deck/Pictures/swieta/113.mp4 -i /home/deck/Pictures/swieta/112.png -filter_complex "
[1:v]scale=${W}:${H},format=rgba[ramka];
[0:v]scale=${W}:${H},format=rgba[vid];
color=c=black@0:s=${W}x${H},format=rgba[bg];
color=c=white:s=${W}x${H},format=rgba[white];

[white]perspective=$P[mask];
[vid]perspective=$P[warped];

[warped][mask]alphamerge[final_vid];

[bg][final_vid]overlay=0:0[vid_layer];
[vid_layer][ramka]overlay=0:0
" -vframes 1 -c:v libwebp -lossless 0 -q:v 75 -an -y /home/deck/Pictures/swieta/test_klatki.webp

echo "Klatka testowa gotowa: /home/deck/Pictures/swieta/test_klatki.webp"
