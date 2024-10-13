// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/utils/Counters.sol";

contract DappVotes {
    using Counters for Counters.Counter;
    Counters.Counter private totalPolls;
    Counters.Counter private totalContestants;

    struct PollStruct {
        uint id;
        string image;
        string title;
        string description;
        uint votes;
        uint contestants;
        bool deleted;
        address director;
        uint startsAt;
        uint endsAt;
        uint timestamp;
        address[] voters;
        string[] avatars;
    }

    struct ContestantStruct {
        uint id;
        string image;
        string name;
        address voter;
        uint votes;
        address[] voters;
    }

    mapping(uint => bool) pollExist;
    mapping(uint => PollStruct) polls;
    mapping(uint => mapping(address => bool)) voted;
    mapping(uint => mapping(address => bool)) contested;
    mapping(uint => mapping(uint => ContestantStruct)) contestants;

    event Voted(address indexed voter, uint timestamp);

    modifier pollExists(uint pollId) {
        require(pollExist[pollId], "Poll not found");
        _;
    }

    function createPoll(string memory _image, string memory _title, string memory _description, uint _startsAt, uint _endsAt) public {
        require(bytes(_image).length > 0, "Image URL cannot be empty");
        require(_startsAt > 0, "Start date must be greater than 0");
        
        totalPolls.increment();
        uint pollId = totalPolls.current();
        PollStruct storage poll = polls[pollId];

        poll.id = pollId;
        poll.image = _image;
        poll.title = _title;
        poll.description = _description;
        poll.startsAt = _startsAt;
        poll.endsAt = _endsAt;
        poll.director = msg.sender;
        poll.timestamp = block.timestamp;

        pollExist[pollId] = true;
    }

    function updatePoll(uint _pollId, string memory _image, string memory _title, string memory _description, uint _startsAt, uint _endsAt) public pollExists(_pollId) {
        PollStruct storage poll = polls[_pollId];
        require(msg.sender == poll.director, "Only the director can update the poll");

        poll.image = _image;
        poll.title = _title;
        poll.description = _description;
        poll.startsAt = _startsAt;
        poll.endsAt = _endsAt;
    }

    function deletePoll(uint _pollId) public pollExists(_pollId) {
        PollStruct storage poll = polls[_pollId];
        require(msg.sender == poll.director, "Only the director can delete the poll");

        poll.deleted = true;
    }

    function getPolls() public view returns (PollStruct[] memory) {
        uint count = totalPolls.current();
        uint activePollsCount;
        for (uint i = 1; i <= count; i++) {
            if (!polls[i].deleted) {
                activePollsCount++;
            }
        }

        PollStruct[] memory activePolls = new PollStruct[](activePollsCount);
        uint index = 0;
        for (uint i = 1; i <= count; i++) {
            if (!polls[i].deleted) {
                activePolls[index] = polls[i];
                index++;
            }
        }
        return activePolls;
    }

    function getPoll(uint _pollId) public view pollExists(_pollId) returns (PollStruct memory) {
        return polls[_pollId];
    }

    function contest(uint _pollId, string memory _name, string memory _avatar) public pollExists(_pollId) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(!contested[_pollId][msg.sender], "Already contested");

        totalContestants.increment();
        uint contestantId = totalContestants.current();
        ContestantStruct storage contestant = contestants[_pollId][contestantId];

        contestant.id = contestantId;
        contestant.name = _name;
        contestant.image = _avatar;
        contestant.voter = msg.sender;

        polls[_pollId].contestants++;
        contested[_pollId][msg.sender] = true;
    }

    function getContestants(uint _pollId) public view pollExists(_pollId) returns (ContestantStruct[] memory) {
        uint count = totalContestants.current();
        ContestantStruct[] memory activeContestants = new ContestantStruct[](polls[_pollId].contestants);
        uint index = 0;
        for (uint i = 1; i <= count; i++) {
            if (contestants[_pollId][i].id != 0) {
                activeContestants[index] = contestants[_pollId][i];
                index++;
            }
        }
        return activeContestants;
    }

    function vote(uint _pollId, uint _contestantId) public pollExists(_pollId) {
        require(!voted[_pollId][msg.sender], "Already voted");
        require(polls[_pollId].endsAt > block.timestamp, "Polling not available");

        polls[_pollId].votes++;
        polls[_pollId].voters.push(msg.sender);
        voted[_pollId][msg.sender] = true;

        ContestantStruct storage contestant = contestants[_pollId][_contestantId];
        contestant.votes++;
        contestant.voters.push(msg.sender);

        emit Voted(msg.sender, block.timestamp);
    }

    function getContestant(uint _pollId, uint _contestantId) public view pollExists(_pollId) returns (ContestantStruct memory) {
        return contestants[_pollId][_contestantId];
    }
}
