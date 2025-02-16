for file in *.png; do
    ffmpeg -i "$file" -q:v 0 -c:v mjpeg "${file%.png}.jpeg"
done
