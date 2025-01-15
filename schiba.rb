class Schiba < Formula
  desc "Extract database schema in a compact format for AI chat context"
  homepage "https://github.com/yourusername/schiba"
  url "https://registry.npmjs.org/schiba/-/schiba-0.1.0.tgz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_PUBLISHING"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "0.1.0", shell_output("#{bin}/schiba --version")
  end
end