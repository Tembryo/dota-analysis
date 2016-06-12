# dota-analysis
Advanced Dota Analysis


##api-server

Setup

* install docker + compose http://docs.docker.com/engine/installation/ubuntulinux/


##SETTING UP SERVERS

login as root --
adduser fischerq
visudo 
add line: 
fischerq ALL=(ALL:ALL) ALL

login as user:
sudo -i
copy installation command from https://github.com/docker/compose/releases
sudo chmod +x /usr/local/bin/docker-compose

create docker usergroup:
sudo groupadd docker
sudo gpasswd -a ${USER} docker
sudo service docker restart

cd /usr/local
sudo git clone https://github.com/Tembryo/dota-analysis.git

droplet3:
root:the-third-droppings

droplet 4:
root:super-four-guys

mini5:
root:whaddup-liquid-go

wisdota_bot_40
crawley-the-bot-40
wisdota-bot40@wisdota.com
insert into steamaccounts (name, password) values ('wisdota_bot_40', 'crawley-the-bot-40');