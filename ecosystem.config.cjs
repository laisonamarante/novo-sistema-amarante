module.exports = {
  apps: [{
    name: "novo-amarante",
    script: "npx",
    args: "tsx server/index.ts",
    cwd: "/home/laisonamarante/novo_amarante",
    env: {
      NODE_ENV: "production",
      DB_HOST: "localhost",
      DB_PORT: "3306",
      DB_NAME: "novo_sistema_amarante",
      DB_USER: "amarante",
      DB_PASS: "Amara2026db",
      JWT_SECRET: "amarante2026_secret_key_prod",
      PORT: "3050",
      CLIENT_URL: "http://136.113.100.28"
    }
  }]
}
