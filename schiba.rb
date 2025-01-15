require "language/node"

class Schiba < Formula
  desc "Extract database schema in a compact format for AI chat context"
  homepage "https://github.com/kennylwx/schiba"
  url "https://registry.npmjs.org/schiba/-/schiba-0.1.1.tgz"
  sha256 "982ee78d41fa60961eff4f4a5fb0153d545778717c0a77ed387acab633b3681a"
  license "MIT"

  depends_on "node"
  depends_on "icu4c"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    output = shell_output("#{bin}/schiba --version")
    assert_match "0.1.1", output
  end
end