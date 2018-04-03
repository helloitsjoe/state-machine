import {StateMachine, State, Transition, ERROR_PREFIX} from '../';
import assert = require('assert');
import sinon = require('sinon');

interface TestSession {
}

class Resolver extends State<TestSession> {
	public onEntrySpy:sinon.SinonSpy;
	constructor(name:string, public transition = ``, public value = null) {
		super(name);
		this.onEntrySpy = sinon.spy(this, `onEntry`);
	}
	onEntry() {
		return Promise.resolve([this.transition, this.value] as Transition);
	}
}

class Rejecter extends State<TestSession> {
	public onEntrySpy:sinon.SinonSpy;
	constructor(name:string, public err) {
		super(name);
		this.onEntrySpy = sinon.spy(this, `onEntry`);
	}
	onEntry() {
		return Promise.reject(this.err);
	}
}

describe(`Core Functionality`, function() {
	it(`Can instantiate StateMachine`, function() {
		const sm = new StateMachine();
		assert.equal(typeof sm.run, `function`, `StateMachine.run should be a function`);
	});
	
	it(`Can add first state`, function() {
		const sm = new StateMachine();
		const state = new Resolver(`Test state`);
		sm.addTransition(null, null, state);
		assert.equal((sm as any).firstState, state, `First state is the supplied state`);
	});
	
	it(`Can't add two first states`, function() {
		assert.throws(function() {
			const sm = new StateMachine();
			const first = new Resolver(`First state`);
			sm.addTransition(null, null, first);
			const bad = new Resolver(`Also first state`);
			sm.addTransition(null, null, bad);
		}, `Should throw an error if a second first state is added`);
	});
	
	it(`Can add last state`, function() {
		const sm = new StateMachine();
		const last = new Resolver(`Last`);
		sm.addTransition(``, last);
		assert.equal((last as any).transitions.get(``), null, `Last state transitions to null`);
	});
	
	describe(`Transitions`, function() {
		it(`States transition all the way through`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`trans`, first, last);
			sm.addTransition(``, last);
			assert.equal((first as any).transitions.get(`trans`), last, `First state should go to last state`);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
				assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
			});
		});
		
		it(`StateMachine rejects if no transition found`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			return sm.run({})
			.then((result) => {
				throw new Error(`StateMachine should have rejected on run()`);
			}, (err:Transition) => {
				assert.equal(err[0], `${ERROR_PREFIX}TransitionError`, `Rejection transition should be the transition error`);
				assert(err[1] instanceof Error, `Output should be an Error instance`);
			});
		});
		
		it(`States transition using wildcard transition`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(``, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`States transition using specific transition over wildcard transition`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const decoy = new Resolver(`Decoy`, `bad`, 0);
			sm.addTransition(``, first, decoy);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(decoy.onEntrySpy.notCalled, `Decoy state should not have been entered`);
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			assert.equal((first as any).transitions.get(`${ERROR_PREFIX}trans`), last, `First state should go to last state`);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
				assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
			});
		});
		
		it(`Less specific error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans.longForm`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Wildcard error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans.longForm`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Specific error transitions are preferred over wildcard errors`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans.longForm`);
			sm.addTransition(null, null, first);
			const decoy = new Resolver(`Decoy`, `bad`, 0);
			sm.addTransition(`${ERROR_PREFIX}`, first, decoy);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(decoy.onEntrySpy.notCalled, `Decoy state should not have been entered`);
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Rejections with transition data are handled normally`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, [`${ERROR_PREFIX}trans`, `foo`]);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], `foo`, `Second state input should be state output`);
			});
		});
		
		it(`Rejections with transition data with non-error strings are converted to errors`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, [`trans`, `foo`]);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], `foo`, `Second state input should be state output`);
			});
		});
		
		it(`Rejections with error strings are converted to error transitions`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, `${ERROR_PREFIX}trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], null, `Second state input should be null`);
			});
		});
		
		it(`Rejections with non-error strings are converted to error transitions`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], null, `Second state input should be null`);
			});
		});
		
		it(`Rejections with errors are converted to error transitions`, function() {
			const error = new Error(`Test error`);
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, error);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}${error.name}`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}${error.name}`, `Transition should be the correct error string`);
				sinon.assert.match(last.onEntrySpy.firstCall.args[2], {message:`Test error`, name: error.name});
			});
		});
	});
});