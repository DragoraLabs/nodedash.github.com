# PaperMC 1.21.3 + Java 21 → works perfectly in CodeSandbox Devbox
FROM eclipse-temurin:21-jdk-alpine

# Install tools (no non-root user anymore → fixes all permission problems)
RUN apk add --no-cache curl jq tini

WORKDIR /data
EXPOSE 25565

ENTRYPOINT ["/sbin/tini", "--"]
CMD sh -c '\
  echo "Minecraft version: ${MC_VERSION:-1.21.3}" && \
  \
  [ "$EULA" = TRUE ] || [ "$EULA" = true ] || { echo "Add -e EULA=TRUE"; exit 1; } && \
  echo "eula=true" > eula.txt && \
  \
  if [ ! -f paper.jar ]; then \
  echo && echo "DOWNLOADING PAPERMC ${MC_VERSION:-1.21.3}" && echo "──────────────────────────────────────" && \
  VERSION=${MC_VERSION:-1.21.3} && \
  BUILD=$(curl -s https://api.papermc.io/v2/projects/paper/versions/$VERSION | jq -r ".builds[-1]") && \
  curl -fsSL -o paper.jar https://api.papermc.io/v2/projects/paper/versions/$VERSION/builds/$BUILD/downloads/paper-$VERSION-$BUILD.jar && \
  echo "PaperMC $VERSION build $BUILD ready!" && echo; \
  fi && \
  \
  echo "Starting server with ${MEMORY:-2G} RAM…" && echo "───────────────────────────────────── LIVE CONSOLE ─────" && \
  java -Xms${MEMORY:-2G} -Xmx${MEMORY:-2G} \
  -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 \
  -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC \
  -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M \
  -XX:G1ReservePercent=20 \
  -jar paper.jar --nogui'
