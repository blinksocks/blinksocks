module.exports = [
  {
    id: 0,
    presets: [
      {"name": "ss-base"},
      {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
    ]
  },
  {
    id: 1,
    presets: [
      {"name": "ss-base"},
      {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}}
    ]
  }
];
