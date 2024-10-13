const { expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

async function isNodeConnected() {
    try {
        await ethers.provider.getBlockNumber();
        return true;
    } catch (error) {
        console.error('Failed to connect to the node:', error);
        return false;
    }

}

describe('DappVotes Contract', function () {
    let contract, deployer, contestant1, contestant2, voter1, voter2, voter3;
    let pollId, contestantId;
    const name1 = 'Contestant 1';
    const name2 = 'Contestant 2';
    const avatar1 = 'https://avatar1.png';
    const avatar2 = 'https://avatar2.png';
    const description = 'Lorem Ipsum';
    const title = 'Republican Primary Election';
    const image = 'https://image.png';
    const starts = Math.floor(Date.now() / 1000) - 10 * 60;
    const ends = Math.floor(Date.now() / 1000) + 10 * 60;

    before(async function () {
        if (!await isNodeConnected()) {
            this.skip();
        }
        const Contract = await ethers.getContractFactory('DappVotes');
        [deployer, contestant1, contestant2, voter1, voter2, voter3] = await ethers.getSigners();
        contract = await Contract.deploy();
        await contract.deployed();
        console.log('Contract deployed at:', contract.address);
    });

    describe('Poll Management', function () {
        beforeEach(async function () {
            await contract.createPoll(image, title, description, starts, ends, { gasLimit: 5000000 });
            const result = await contract.getPolls();
            pollId = result[0].id;
            console.log('Poll created with ID:', pollId);
        });

        describe('Successes', function () {
            it('should confirm poll creation success', async function () {
                const result = await contract.getPolls();
                expect(result).to.have.lengthOf(1);
                const poll = result[0];
                expect(poll.title).to.equal(title);
                expect(poll.description).to.equal(description);
                expect(poll.image).to.equal(image);
                expect(Number(poll.startsAt)).to.equal(starts);
                expect(Number(poll.endsAt)).to.equal(ends);
                expect(poll.director).to.equal(deployer.address);
            });

            it('should confirm poll update success', async function () {
                const newTitle = 'Democratic Primary Election';
                await contract.updatePoll(pollId, image, newTitle, description, starts, ends, { gasLimit: 5000000 });
                const result = await contract.getPoll(pollId);
                expect(result.title).to.equal(newTitle);
            });

            it('should confirm poll deletion success', async function () {
                await contract.deletePoll(pollId, { gasLimit: 5000000 });
                const result = await contract.getPoll(pollId);
                expect(result.deleted).to.be.true;
            });
        });

        describe('Failure', function () {
            it('should confirm poll creation failure', async function () {
                await expectRevert(contract.createPoll('', title, description, starts, ends, { gasLimit: 5000000 }), 'Image URL cannot be empty');
                await expectRevert(contract.createPoll(image, title, description, 0, ends, { gasLimit: 5000000 }), 'Start date must be greater than 0');
            });

            it('should confirm poll update failure', async function () {
                await expectRevert(contract.updatePoll(100, image, 'New Title', description, starts, ends, { gasLimit: 5000000 }), 'Poll not found');
            });

            it('should confirm poll deletion failures', async function () {
                await expectRevert(contract.deletePoll(100, { gasLimit: 5000000 }), 'Poll not found');
            });
        });
    });

    describe('Poll Contest', function () {
        beforeEach(async function () {
            const result = await contract.getPolls();
            pollId = result[0].id;
            console.log('Poll ID for contest:', pollId);
        });

        describe('Success', function () {
            it('should confirm contest entry success', async function () {
                await contract.connect(contestant1).contest(pollId, name1, avatar1, { gasLimit: 5000000 });
                await contract.connect(contestant2).contest(pollId, name2, avatar2, { gasLimit: 5000000 });
                const contestants = await contract.getContestants(pollId);
                expect(contestants).to.have.lengthOf(2);
            });
        });

        describe('Failure', function () {
            it('should confirm contest entry failure', async function () {
                await expectRevert(contract.contest(100, name1, avatar1, { gasLimit: 5000000 }), 'Poll not found');
                await expectRevert(contract.contest(pollId, '', avatar1, { gasLimit: 5000000 }), 'Name cannot be empty');

                await contract.connect(contestant1).contest(pollId, name1, avatar1, { gasLimit: 5000000 });
                await contract.connect(contestant2).contest(pollId, name2, avatar2, { gasLimit: 5000000 });
                await expectRevert(contract.connect(contestant1).contest(pollId, name1, avatar1, { gasLimit: 5000000 }), 'Already contested');
            });
        });
    });

    describe('Poll Voting', function () {
        beforeEach(async function () {
            const result = await contract.getPolls();
            pollId = result[0].id;
            await contract.connect(contestant1).contest(pollId, name1, avatar1, { gasLimit: 5000000 });
            await contract.connect(contestant2).contest(pollId, name2, avatar2, { gasLimit: 5000000 });
            const contestants = await contract.getContestants(pollId);
            contestantId = contestants[0].id;
            console.log('Poll ID for voting:', pollId);
            console.log('Contestant ID for voting:', contestantId);
        });

        describe('Success', function () {
            it('should confirm voting success', async function () {
                await contract.connect(voter1).vote(pollId, contestantId, { gasLimit: 5000000 });
                await contract.connect(voter2).vote(pollId, contestantId, { gasLimit: 5000000 });
                const result = await contract.getContestant(pollId, contestantId);
                expect(result.votes).to.be.equal(2);
            });
        });

        describe('Failure', function () {
            it('should confirm voting failure', async function () {
                await expectRevert(contract.vote(100, contestantId, { gasLimit: 5000000 }), 'Poll not found');
                await contract.deletePoll(pollId, { gasLimit: 5000000 });
                await expectRevert(contract.vote(pollId, contestantId, { gasLimit: 5000000 }), 'Polling not available');
            });
        });
    });
});
