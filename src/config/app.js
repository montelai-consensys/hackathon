require('dotenv').config();
export default {
  port: process.env.PORT || 9000,
  initScan: process.env.INIT_DATA || '0',
  provider: process.env.PROVIDER || "ws://localhost:8546",
  nonceLevel: process.env.NONCE_LEVEL || 20
}
  