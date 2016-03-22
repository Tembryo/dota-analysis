cd /webserver
sudo docker build -t tembryo/wisdota-scheduler -f scheduler/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-webserver -f webserver/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-retrieve -f retrieve/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-download -f download/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-analysis -f analysis/Dockerfile-deploy .