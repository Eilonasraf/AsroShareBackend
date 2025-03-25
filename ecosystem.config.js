module.exports = {
  apps : [{
    name   : "AstroShare",
    script: "./dist/src/app.js",
    env_production: {
      NODE_ENV: "production"
    }
  }]
}
