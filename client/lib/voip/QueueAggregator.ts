/**
 * Class representing the agent's queue information. This class stores the information
 * of all the queues that the agent is serving.
 *
 * @remarks
 * This class stores the necessary information of agent's queue stats.
 * It also maintains a history of agents queue operation history for current
 * login session. (Agent logging in to rocket-chat and logging off from rocket chat.)
 * Currently the data is stored locally but may sent back to server if such need exists.
 */

import { IQueueMembershipSubscription } from '../../../definition/IVoipExtension';
import { ICallerInfo } from '../../../definition/voip/ICallerInfo';
import { IQueueInfo } from '../../../definition/voip/IQueueInfo';

interface IQueueServingRecord {
	queueInfo: IQueueInfo;
	callStarted: Date | undefined;
	callEnded: Date | undefined;
	callerId: ICallerInfo;
	agentExtension: string;
}
/**
 * Currently this class depends on the external users to update this class.
 * But in theory, this class serves as
 */
export class QueueAggregator {
	// Maintains the history of the queue that the agent has served
	private sessionQueueCallServingHistory: IQueueServingRecord[];

	private currentlyServing: IQueueServingRecord | undefined;

	private currentQueueMembershipStatus: Record<string, IQueueInfo>;

	private extension: string;

	constructor() {
		this.sessionQueueCallServingHistory = [];
		this.currentQueueMembershipStatus = {};
	}

	private updateQueueInfo(queueName: string, queuedCalls: number): void {
		if (!this.currentQueueMembershipStatus[queueName]) {
			// something is wrong. Queue is not found in the membership details.
			return;
		}
		this.currentQueueMembershipStatus[queueName].callsInQueue = queuedCalls;
	}

	setMembership(subscription: IQueueMembershipSubscription): void {
		this.extension = subscription.extension;
		for (let i = 0; i < subscription.queues.length; i++) {
			const queue = subscription.queues[i];
			const queueInfo: IQueueInfo = {
				queueName: queue.name,
				callsInQueue: 0,
			};
			this.currentQueueMembershipStatus[queue.name] = queueInfo;
		}
	}

	queueJoined(joiningDetails: { queuename: string; callerid: { id: string }; queuedcalls: string }): void {
		this.updateQueueInfo(joiningDetails.queuename, Number(joiningDetails.queuedcalls));
	}

	callPickedup(queue: { queuename: string; queuedcalls: string; waittimeinqueue: string }): void {
		this.updateQueueInfo(queue.queuename, Number(queue.queuedcalls));
	}

	memberAdded(queue: { queuename: string; queuedcalls: string }): void {
		// current user is added in the queue which has queue count |queuedcalls|
		const queueInfo: IQueueInfo = {
			queueName: queue.queuename,
			callsInQueue: Number(queue.queuedcalls),
		};
		this.currentQueueMembershipStatus[queue.queuename] = queueInfo;
	}

	memberRemoved(queue: { queuename: string; queuedcalls: string }): void {
		// current user is removed from the queue which has queue count |queuedcalls|
		if (!this.currentQueueMembershipStatus[queue.queuename]) {
			// something is wrong. Queue is not found in the membership details.
			return;
		}
		delete this.currentQueueMembershipStatus[queue.queuename];
	}

	queueAbandoned(queue: { queuename: string; queuedcallafterabandon: string }): void {
		this.updateQueueInfo(queue.queuename, Number(queue.queuedcallafterabandon));
	}

	getCallWaitingCount(): number {
		let totalCallWaitingCount = 0;
		Object.entries(this.currentQueueMembershipStatus).forEach(([, value]) => {
			totalCallWaitingCount += value.callsInQueue;
		});
		return totalCallWaitingCount;
	}

	callRinging(queueInfo: { queuename: string; callerId: { id: string; name: string } }): void {
		if (!this.currentQueueMembershipStatus[queueInfo.queuename]) {
			// something is wrong. Queue is not found in the membership details.
			return;
		}

		const queueServing: IQueueServingRecord = {
			queueInfo: this.currentQueueMembershipStatus[queueInfo.queuename],
			callerId: {
				callerId: queueInfo.callerId.id,
				callerName: queueInfo.callerId.name,
			},
			callStarted: undefined,
			callEnded: undefined,
			agentExtension: this.extension,
		};
		this.currentlyServing = queueServing;
	}

	callStarted(): void {
		if (this.currentlyServing) {
			this.currentlyServing.callStarted = new Date();
		}
	}

	callEnded(): void {
		// Latest calls are at lower index
		if (this.currentlyServing) {
			this.currentlyServing.callEnded = new Date();
			this.sessionQueueCallServingHistory.unshift(this.currentlyServing);
		}
	}
}
