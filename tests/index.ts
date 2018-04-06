describe('State Machine Library', function() {
	//core tests
	require('./creation.test');
	require('./transitions.test');
	require('./interruption.test');
	//extensions
	require('./exec.test');
	require('./submachine.test');
	require('./wait.test');
});