export const NOOP = 0x00;
export const SOCKS_VERSION_V4 = 0x04;
export const SOCKS_VERSION_V5 = 0x05;
export const METHOD_NO_AUTH = 0x00;

export const REQUEST_COMMAND_CONNECT = 0x01;
export const REQUEST_COMMAND_BIND = 0x02;
export const REQUEST_COMMAND_UDP = 0x03;

export const ATYP_V4 = 0x01;
export const ATYP_DOMAIN = 0x03;
export const ATYP_V6 = 0x04;

export const REPLY_GRANTED = 0x5a; // 90
export const REPLY_SUCCEEDED = 0x00;
// export const REPLY_FAILURE = 0x01;
// export const REPLY_NOT_ALLOWED = 0x02;
// export const REPLY_NETWORK_UNREACHABLE = 0x03;
// export const REPLY_HOST_UNREACHABLE = 0x04;
// export const REPLY_CONNECION_REFUSED = 0x05;
// export const REPLY_TTL_EXXPIRED = 0x06;
export const REPLY_COMMAND_NOT_SUPPORTED = 0x07;
// export const REPLY_ADDRESS_TYPE_NOT_SUPPORTED = 0x08;
export const REPLY_UNASSIGNED = 0xff;
