// This file conditionally imports the real GoogleSignIn on Mobile
// and the Stub on Web (to avoid the compilation error).

export 'google_auth_stub.dart'
  if (dart.library.io) 'package:google_sign_in/google_sign_in.dart';
