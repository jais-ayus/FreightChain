const FreightManager = artifacts.require("FreightManager");

module.exports = function (deployer) {
  deployer.deploy(FreightManager);
}; 