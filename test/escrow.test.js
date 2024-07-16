import { expect } from "chai";

describe("Escrow", function () {
  let contract;
  let erc20;

  let happyPathAccount;
  let unhappyPathAccount;
  const amount = ethers.utils.parseUnits("10.0");
  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("MockDaiToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed();
    /**
     * Get test accounts
     * */
    const accounts = await hre.ethers.getSigners();
    const deployer = accounts[0];
    happyPathAccount = accounts[1];
    unhappyPathAccount = accounts[2];
    /**
     * Transfer some ERC20s to happyPathAccount
     * */
    const transferTx = await erc20.transfer(
      happyPathAccount.address,
      "80000000000000000000"
    );
    await transferTx.wait();
    /**
     * Deploy Escrow Contract
     *
     * - Add ERC20 address to the constructor
     * - Add escrow admin wallet address to the constructor
     * */
    const EscrowContract = await ethers.getContractFactory("Escrow");
    contract = await EscrowContract.deploy(erc20.address);
    await contract.deployed();
    /**
     * Seed ERC20 allowance
     * */
    const erc20WithSigner = erc20.connect(happyPathAccount);
    const approveTx = await erc20WithSigner.approve(
      contract.address,
      "90000000000000000000"
    );
    await approveTx.wait();
  });

  it("Happy Path: depositEscrow", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);
    const trxHash = await contract.getHash(amount);
    const depositEscrowTx = await contractWithSigner.depositEscrow(trxHash, amount);
    await depositEscrowTx.wait();
    expect((await erc20.balanceOf(happyPathAccount.address)).toString()).to.equal(
      "70000000000000000000"
    );
  });

  it("Unhappy Path: depositEscrow - Transaction hash cannot be empty!", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);
    let err = "";
    try {
      await contractWithSigner.depositEscrow(ethers.constants.HashZero, amount);
    } catch (e) {
      err = e.message;
    }
    expect(err).to.equal(
      "VM Exception while processing transaction: reverted with reason string 'Transaction hash cannot be empty!'"
    );
  });

  it("Unhappy Path: depositEscrow - Escrow amount cannot be equal to 0.", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);
    const trxHash = await contract.getHash(amount);
    let err = "";
    try {
      await contractWithSigner.depositEscrow(trxHash, ethers.utils.parseUnits("0"));
    } catch (e) {
      err = e.message;
    }
    expect(err).to.equal(
      "VM Exception while processing transaction: reverted with reason string 'Escrow amount cannot be equal to 0.'"
    );
  });

  it("Unhappy Path: depositEscrow - Unique hash conflict, hash is already in use.", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);
    const trxHash = await contract.getHash(amount);
    const depositEscrowTx = await contractWithSigner.depositEscrow(trxHash, amount);
    await depositEscrowTx.wait();
    expect((await erc20.balanceOf(happyPathAccount.address)).toString()).to.equal(
      "60000000000000000000"
    );
    let err = "";
    try {
      await contractWithSigner.depositEscrow(trxHash, amount);
    } catch (e) {
      err = e.message;
    }
    expect(err).to.equal(
      "VM Exception while processing transaction: reverted with reason string 'Unique hash conflict, hash is already in use.'"
    );
  });

  it("Unhappy Path: depositEscrow - ERC20: insufficient allowance", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);
    const trxHash = await contract.getHash(amount);
    let err = "";
    try {
      await contractWithSigner.depositEscrow(trxHash, amount);
    } catch (e) {
      err = e.message;
    }
    expect(err).to.contain("ERC20InsufficientAllowance");
  });

  it("Happy Path: withdrawalEscrow", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);
    const trxHash = await contract.getHash(amount);
    const depositEscrowTx = await contractWithSigner.depositEscrow(trxHash, amount);
    await depositEscrowTx.wait();
    expect((await erc20.balanceOf(happyPathAccount.address)).toString()).to.equal(
      "50000000000000000000"
    );
    const withdrawalEscrowTx = await contractWithSigner.withdrawalEscrow(trxHash);
    await withdrawalEscrowTx.wait();
    expect((await erc20.balanceOf(happyPathAccount.address)).toString()).to.equal(
      "60000000000000000000"
    );
  });

  it("Unhappy Path: withdrawalEscrow - Transaction hash cannot be empty!", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);
    let err = "";
    try {
      await contractWithSigner.withdrawalEscrow(ethers.constants.HashZero);
    } catch (e) {
      err = e.message;
    }
    expect(err).to.equal(
      "VM Exception while processing transaction: reverted with reason string 'Transaction hash cannot be empty!'"
    );
  });

  it("Unhappy Path: withdrawalEscrow - Escrow with transaction hash doesn't exist.", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);
    const trxHash = await contract.getHash(ethers.utils.parseUnits("1.0"));
    let err = "";
    try {
      await contractWithSigner.withdrawalEscrow(trxHash);
    } catch (e) {
      err = e.message;
    }
    expect(err).to.equal(
      "VM Exception while processing transaction: reverted with reason string 'Escrow with transaction hash doesn't exist.'"
    );
  });
});
