sudo docker build -t tembryo/wisdota-scheduler -f scheduler/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-webserver -f webserver/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-retrieve -f retrieve/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-download -f download/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-analysis -f analysis/Dockerfile-deploy .
sudo docker build -t tembryo/wisdota-crawl -f crawler/Dockerfile-deploy .
sudo docker push tembryo/wisdota-scheduler
sudo docker push tembryo/wisdota-webserver
sudo docker push tembryo/wisdota-retrieve
sudo docker push tembryo/wisdota-download
sudo docker push tembryo/wisdota-analysis
sudo docker push tembryo/wisdota-crawl