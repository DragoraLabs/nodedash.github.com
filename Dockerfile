FROM eclipse-temurin:21-jdk-alpine
RUN apk add --no-cache curl jq tini
WORKDIR /data
VOLUME /data
EXPOSE 25565
ENTRYPOINT ["/sbin/tini","--"]
CMD sh -c '
echo "eula=true">eula.txt
if [ ! -f paper.jar ]; then
  BUILD=$(curl -s https://api.papermc.io/v2/projects/paper/versions/1.21.3|jq -r ".builds[-1]")
  curl -fsSL -o paper.jar https://api.papermc.io/v2/projects/paper/versions/1.21.3/builds/$BUILD/downloads/paper-1.21.3-$BUILD.jar
fi
java -Xmx4G -jar paper.jar --nogui
'
COPY minecraft_server /data