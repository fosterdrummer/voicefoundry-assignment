import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as AppHost from '../lib/app-host';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AppHost.S3AppHost(app, 'MyTestStack', {
      appName: 'Yeet',
      appIndexFileName: 'index.html'
    });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
