module.exports = {

    db_name: "myGame",

    account: "account",

    questions: "questions",

    rankPositionsDisplayed: 5,

    /**
     * 
     * @param {*} client 
     * @param {*} username 
     * @param {*} password 
     * Finds a registry by its username and password. 
     * @returns The registry if it exists, null if it doesn't.
     */
    isValidPassword: async function (client, username, password) {
        //return true;
        return await client.db(this.db_name).collection(this.account).findOne({ username: username, password: password });

    },

    /**
     * 
     * @param {*} client 
     * @param {*} username 
     * @returns Returns true or false whether the username passed is already taken
     */
    isUsernameTaken: async function (client, username) {
        //return false;
        user = await client.db(this.db_name).collection(this.account).findOne({ username: username });

        if (user) {
            return true
        } else {
            return false
        }
    },

    /**
     * 
     * @param {*} client 
     * @param {*} username 
     * @param {*} password 
     * @returns the number of inserted registries. Doesn't care about duplicates
     */
    addUser: async function (client, username, password) {
        aux = await client.db(this.db_name).collection(this.account).insertOne({ username: username, password: password, score: 0 });
        return aux.insertedCount;

    },

    /**
     * 
     * @param {*} client 
     * @param {*} username 
     * @returns matchedCount and modifiedCount
     */
    scoreInc1: async function (client, username) {
        result = await client.db(this.db_name).collection(this.account).updateOne({ username: username }, { $inc: { score: 1 } });
        return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };

    },


    /**
     * 
     * @param {*} client 
     * @param {*} username 
     * @returns matchedCount and modifiedCount
     */
    scoreClean: async function (client, username) {
        result = await client.db(this.db_name).collection(this.account).updateOne({ username: username }, { $set: { score: 0 } });
        return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }

    },

    /**
     * 
     * @param {*} client 
     * @returns Array with the first  'rankPositionsDisplayed' users ordered desc by score
     */
    getRankArray: async function (client) {
        return await client.db(this.db_name).collection(this.account).find({ score: { $gt: 0 } }).project({ _id: 0, username: 1, score: 1 }).sort({ score: -1 }).limit(this.rankPositionsDisplayed).toArray();

    },

    findRandomQuestion: async function (client) {
        return await client.db(this.db_name).collection(this.questions).aggregate([{ $sample: { size: 1 } }]).toArray();

    },

};
