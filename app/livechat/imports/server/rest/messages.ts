import { check } from 'meteor/check';

import { API } from '../../../../api/server';
import { findExternalMessages } from '../../../server/api/lib/messages';

API.v1.addRoute(
	'livechat/messages.external/:roomId',
	{ authRequired: true },
	{
		async get() {
			check(this.urlParams, {
				roomId: String,
			});
			const { offset, count } = this.getPaginationItems();
			const { sort } = this.parseJsonQuery();

			const departments = await findExternalMessages(this.urlParams.roomId, {
				pagination: {
					offset,
					count,
					sort,
				},
			});

			return API.v1.success(departments);
		},
	},
);