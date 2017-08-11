module.exports = [
  // ss-base
  {
    presets: [
      {"name": "ss-base"}
    ]
  },
  // exp-base-with-padding
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}}
    ]
  },
  // exp-base-auth-stream
  {
    presets: [
      {"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}}
    ]
  },
  // shadowsocks stream ciphers
  {
    presets: [
      {"name": "ss-base"},
      {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
    ]
  },
  {
    presets: [
      {"name": "ss-base"},
      {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
    ]
  },
  {
    presets: [
      {"name": "ss-base"},
      {"name": "ss-stream-cipher", "params": {"method": "camellia-256-cfb"}}
    ]
  },
  // shadowsocks aead ciphers
  {
    presets: [
      {"name": "ss-base"},
      {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}}
    ]
  },
  // obfs-tls1.2-ticket
  {
    presets: [
      {"name": "ss-base"},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // ss-stream-cipher + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "ss-base"},
      {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // ss-aead-cipher + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "ss-base"},
      {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // blinksocks aead-random-cipher
  {
    presets: [
      {"name": "ss-base"},
      {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}}
    ]
  },
  // blinksocks aead-random-cipher + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "ss-base"},
      {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // blinksocks exp-base-with-padding + ss-stream-cipher
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
      {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
    ]
  },
  // blinksocks exp-base-with-padding + ss-stream-cipher + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
      {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // blinksocks exp-base-with-padding + ss-aead-cipher
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
      {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}}
    ]
  },
  // blinksocks exp-base-with-padding + ss-aead-cipher + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
      {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // blinksocks exp-base-with-padding + aead-random-cipher
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
      {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}}
    ]
  },
  // blinksocks exp-base-with-padding + aead-random-cipher + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
      {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  },
  // blinksocks exp-base-auth-stream + obfs-tls1.2-ticket
  {
    presets: [
      {"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
    ]
  }
];
