// Stub class that mimics GoogleSignIn for platforms where it shouldn't be used (e.g. Web in this specific broken environment)
// or where we want to force failure if accessed.

class GoogleSignIn {
  GoogleSignIn();

  Future<dynamic> signIn() async {
    throw UnimplementedError("Google Sign In not supported or stubbed on this platform.");
  }
  
  Future<void> signOut() async {
     // Do nothing
  }
}

class GoogleSignInAuthentication {
  String? get accessToken => null;
  String? get idToken => null;
}

class GoogleSignInAccount {
  Future<GoogleSignInAuthentication> get authentication async => GoogleSignInAuthentication();
}
