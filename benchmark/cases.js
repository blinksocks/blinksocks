const single_presets = [
  // ss-base
  [{"name": "ss-base"}],
  // exp-base-with-padding
  [{"name": "exp-base-with-padding", "params": {"salt": "any string"}}],
  // exp-base-auth-stream
  [{"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}}]
];

const v2ray_presets = [
  [{"name": "v2ray-vmess", "params": {"id": "a3482e88-686a-4a58-8126-99c9df64b7bf", "security": "aes-128-gcm"}}]
];

const shadowsocks_presets = [
  // [shadowsocks stream ciphers]
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "camellia-256-cfb"}}
  ],
  // [shadowsocks aead ciphers]
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ]
];

const two_presets = [
  // ss-base + aead-random-cipher
  [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  // ss-base + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // ss-base + obfs-random-padding
  [
    {"name": "ss-base"},
    {"name": "obfs-random-padding"}
  ],
  // exp-base-with-padding + ss-stream-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  // exp-base-with-padding + ss-aead-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  // exp-base-with-padding + aead-random-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  // exp-base-with-padding + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + obfs-random-padding
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "obfs-random-padding"}
  ],
  // exp-base-auth-stream + obfs-tls1.2-ticket
  [
    {"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-auth-stream + obfs-random-padding
  [
    {"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-random-padding"}
  ]
];

const three_presets = [
  // ss-base + ss-stream-cipher + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // ss-base + obfs-random-padding + ss-stream-cipher
  [
    {"name": "ss-base"},
    {"name": "obfs-random-padding"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  // ss-base + ss-aead-cipher + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // ss-base + obfs-random-padding + ss-aead-cipher
  [
    {"name": "ss-base"},
    {"name": "obfs-random-padding"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  // ss-base + aead-random-cipher + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + ss-stream-cipher + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + obfs-random-padding + ss-stream-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "obfs-random-padding"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  // exp-base-with-padding + ss-aead-cipher + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + obfs-random-padding + ss-aead-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "obfs-random-padding"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  // exp-base-with-padding + aead-random-cipher + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ]
];

module.exports = [
  ...single_presets,
  ...v2ray_presets,
  ...shadowsocks_presets,
  ...two_presets,
  ...three_presets
];
