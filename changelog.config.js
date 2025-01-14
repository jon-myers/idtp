// module.exports = {
// 	writerOpts: {
// 	  reverse: true, // Ensures newest commits are at the top
// 	  transform: (commit) => {
// 		if (commit.committerDate) {
// 		  commit.date = new Date(commit.committerDate).toISOString().split('T')[0];
// 		}
// 		return commit;
// 	  },
// 	  mainTemplate: `
// 		# Changelog
  
// 		{{#each commits}}
// 		- {{header}} ({{hash}}) - **{{author.name}}** on {{date}}
// 		{{/each}}
// 	  `,
// 	},
// 	gitRawCommitsOpts: {
// 	  reverse: true, // Ensures commits are listed from newest to oldest
// 	},
//   };
// export default {
// 	writerOpts: {
// 	  reverse: true,
// 	  transform: (commit) => {
// 		if (commit.committerDate) {
// 		  commit.date = new Date(commit.committerDate).toISOString().split('T')[0];
// 		}
// 		return commit;
// 	  },
// 	  mainTemplate: `
// 		# Changelog
  
// 		{{#each commits}}
// 		- {{header}} ({{hash}}) - **{{author.name}}** on {{date}}
// 		{{/each}}
// 	  `,
// 	},
// 	gitRawCommitsOpts: {
// 	  reverse: true,
// 	},
//   };
export default {
	writerOpts: {
		reverse: true,
		transform: (commit) => {
		if (commit.committerDate) {
			// Return a new object with additional properties
			return {
			...commit,
			date: new Date(commit.committerDate).toISOString().split('T')[0],
			};
		}
		return commit;
		},
		mainTemplate: `
		# Changelog

		{{#each commits}}
		- {{header}} ({{hash}}) - **{{author.name}}** on {{date}}
		{{/each}}
		`,
	},
	gitRawCommitsOpts: {
		reverse: true,
	},
};