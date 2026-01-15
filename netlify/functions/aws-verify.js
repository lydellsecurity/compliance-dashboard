// netlify/functions/aws-verify.js
// AWS Verification Function - Handles AWS SDK calls for compliance verification
//
// SECURITY NOTE: This function receives temporary credentials from the client.
// In production, consider using AWS STS AssumeRole with a cross-account role
// for better security practices.

// ============================================================================
// AWS SDK IMPORTS (Lazy loaded for cold start optimization)
// ============================================================================

let AWS = null;

function getAWS() {
  if (!AWS) {
    AWS = require('aws-sdk');
  }
  return AWS;
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Test AWS connection by calling STS GetCallerIdentity
 */
async function testConnection(credentials) {
  const aws = getAWS();
  const sts = new aws.STS({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  const identity = await sts.getCallerIdentity({}).promise();
  return {
    accountId: identity.Account,
    userId: identity.UserId,
    arn: identity.Arn,
  };
}

/**
 * Check IAM MFA Status for all users
 */
async function checkMFAStatus(credentials) {
  const aws = getAWS();
  const iam = new aws.IAM({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  // List all IAM users
  const usersResponse = await iam.listUsers({}).promise();
  const users = usersResponse.Users || [];

  let usersWithMFA = 0;
  let usersWithoutMFA = 0;
  const details = [];

  for (const user of users) {
    const mfaDevices = await iam.listMFADevices({ UserName: user.UserName }).promise();
    const hasMFA = mfaDevices.MFADevices && mfaDevices.MFADevices.length > 0;

    if (hasMFA) {
      usersWithMFA++;
    } else {
      usersWithoutMFA++;
      details.push(`User '${user.UserName}' does not have MFA enabled`);
    }
  }

  const totalUsers = users.length;
  const mfaPercentage = totalUsers > 0 ? Math.round((usersWithMFA / totalUsers) * 100) : 100;

  let status = 'pass';
  let detailsText = `All ${totalUsers} IAM users have MFA enabled.`;

  if (usersWithoutMFA > 0) {
    status = mfaPercentage >= 80 ? 'partial' : 'fail';
    detailsText = `${usersWithMFA}/${totalUsers} users (${mfaPercentage}%) have MFA enabled. ${usersWithoutMFA} users need MFA.`;
  }

  return {
    status,
    details: detailsText,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalUsers,
        usersWithMFA,
        usersWithoutMFA,
        mfaPercentage,
        usersNeedingMFA: details,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: usersWithoutMFA > 0 ? [
      'Enable MFA for all IAM users',
      'Use virtual MFA devices or hardware security keys',
      'Consider enforcing MFA via IAM policies',
    ] : [],
  };
}

/**
 * Check IAM Password Policy
 */
async function checkPasswordPolicy(credentials) {
  const aws = getAWS();
  const iam = new aws.IAM({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  try {
    const policy = await iam.getAccountPasswordPolicy({}).promise();
    const p = policy.PasswordPolicy;

    // Check against best practices
    const checks = {
      minLength: p.MinimumPasswordLength >= 14,
      requireUppercase: p.RequireUppercaseCharacters === true,
      requireLowercase: p.RequireLowercaseCharacters === true,
      requireNumbers: p.RequireNumbers === true,
      requireSymbols: p.RequireSymbols === true,
      maxAge: p.MaxPasswordAge && p.MaxPasswordAge <= 90,
      preventReuse: p.PasswordReusePrevention && p.PasswordReusePrevention >= 12,
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    const percentage = Math.round((passedChecks / totalChecks) * 100);

    let status = 'pass';
    if (percentage < 100) status = percentage >= 70 ? 'partial' : 'fail';

    const recommendations = [];
    if (!checks.minLength) recommendations.push('Increase minimum password length to 14 characters');
    if (!checks.requireUppercase) recommendations.push('Require uppercase characters');
    if (!checks.requireLowercase) recommendations.push('Require lowercase characters');
    if (!checks.requireNumbers) recommendations.push('Require numbers');
    if (!checks.requireSymbols) recommendations.push('Require special characters');
    if (!checks.maxAge) recommendations.push('Set maximum password age to 90 days or less');
    if (!checks.preventReuse) recommendations.push('Prevent password reuse for at least 12 previous passwords');

    return {
      status,
      details: `Password policy meets ${passedChecks}/${totalChecks} security requirements (${percentage}%)`,
      evidence: {
        type: 'json',
        data: JSON.stringify({ policy: p, checks }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations,
    };
  } catch (error) {
    if (error.code === 'NoSuchEntity') {
      return {
        status: 'fail',
        details: 'No password policy is configured for this account',
        recommendations: ['Configure an IAM password policy with strong requirements'],
      };
    }
    throw error;
  }
}

/**
 * Check S3 Bucket Encryption
 */
async function checkS3Encryption(credentials) {
  const aws = getAWS();
  const s3 = new aws.S3({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  const bucketsResponse = await s3.listBuckets({}).promise();
  const buckets = bucketsResponse.Buckets || [];

  let encryptedBuckets = 0;
  let unencryptedBuckets = 0;
  const bucketDetails = [];

  for (const bucket of buckets) {
    try {
      const encryption = await s3.getBucketEncryption({ Bucket: bucket.Name }).promise();
      encryptedBuckets++;
      bucketDetails.push({
        bucket: bucket.Name,
        encrypted: true,
        algorithm: encryption.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm,
      });
    } catch (error) {
      if (error.code === 'ServerSideEncryptionConfigurationNotFoundError') {
        unencryptedBuckets++;
        bucketDetails.push({ bucket: bucket.Name, encrypted: false });
      }
    }
  }

  const totalBuckets = buckets.length;
  const encryptionPercentage = totalBuckets > 0 ? Math.round((encryptedBuckets / totalBuckets) * 100) : 100;

  let status = 'pass';
  let details = `All ${totalBuckets} S3 buckets have encryption enabled.`;

  if (unencryptedBuckets > 0) {
    status = encryptionPercentage >= 80 ? 'partial' : 'fail';
    details = `${encryptedBuckets}/${totalBuckets} buckets (${encryptionPercentage}%) have encryption enabled.`;
  }

  return {
    status,
    details,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalBuckets,
        encryptedBuckets,
        unencryptedBuckets,
        bucketDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: unencryptedBuckets > 0 ? [
      'Enable default encryption on all S3 buckets',
      'Use AES-256 (SSE-S3) or AWS KMS (SSE-KMS)',
      'Consider bucket policies that deny unencrypted uploads',
    ] : [],
  };
}

/**
 * Check KMS Key Rotation
 */
async function checkKMSRotation(credentials) {
  const aws = getAWS();
  const kms = new aws.KMS({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  const keysResponse = await kms.listKeys({}).promise();
  const keys = keysResponse.Keys || [];

  let keysWithRotation = 0;
  let keysWithoutRotation = 0;
  const keyDetails = [];

  for (const key of keys) {
    try {
      // Get key metadata to check if it's customer managed
      const keyInfo = await kms.describeKey({ KeyId: key.KeyId }).promise();

      // Skip AWS managed keys (they have auto-rotation)
      if (keyInfo.KeyMetadata.KeyManager === 'AWS') {
        continue;
      }

      // Only check symmetric keys (asymmetric keys don't support rotation)
      if (keyInfo.KeyMetadata.KeySpec !== 'SYMMETRIC_DEFAULT') {
        continue;
      }

      const rotation = await kms.getKeyRotationStatus({ KeyId: key.KeyId }).promise();

      if (rotation.KeyRotationEnabled) {
        keysWithRotation++;
        keyDetails.push({ keyId: key.KeyId, rotationEnabled: true });
      } else {
        keysWithoutRotation++;
        keyDetails.push({ keyId: key.KeyId, rotationEnabled: false });
      }
    } catch (error) {
      // Skip keys we can't access
      continue;
    }
  }

  const totalKeys = keysWithRotation + keysWithoutRotation;

  if (totalKeys === 0) {
    return {
      status: 'pass',
      details: 'No customer-managed symmetric KMS keys found (AWS managed keys have automatic rotation)',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalKeys: 0, note: 'Only AWS-managed keys present' }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  const rotationPercentage = Math.round((keysWithRotation / totalKeys) * 100);

  let status = 'pass';
  let details = `All ${totalKeys} customer-managed KMS keys have rotation enabled.`;

  if (keysWithoutRotation > 0) {
    status = rotationPercentage >= 80 ? 'partial' : 'fail';
    details = `${keysWithRotation}/${totalKeys} keys (${rotationPercentage}%) have rotation enabled.`;
  }

  return {
    status,
    details,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalKeys,
        keysWithRotation,
        keysWithoutRotation,
        keyDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: keysWithoutRotation > 0 ? [
      'Enable automatic key rotation for all customer-managed symmetric keys',
      'Use AWS CLI: aws kms enable-key-rotation --key-id <key-id>',
    ] : [],
  };
}

/**
 * Check CloudTrail Status
 */
async function checkCloudTrailStatus(credentials) {
  const aws = getAWS();
  const cloudtrail = new aws.CloudTrail({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  const trails = await cloudtrail.describeTrails({}).promise();
  const trailList = trails.trailList || [];

  if (trailList.length === 0) {
    return {
      status: 'fail',
      details: 'No CloudTrail trails are configured',
      recommendations: [
        'Create a CloudTrail trail to log API activity',
        'Enable multi-region trails for comprehensive logging',
        'Configure S3 bucket encryption for trail logs',
      ],
    };
  }

  let multiRegionTrail = false;
  let loggingEnabled = false;
  const trailDetails = [];

  for (const trail of trailList) {
    const status = await cloudtrail.getTrailStatus({ Name: trail.Name }).promise();

    if (trail.IsMultiRegionTrail) multiRegionTrail = true;
    if (status.IsLogging) loggingEnabled = true;

    trailDetails.push({
      name: trail.Name,
      isMultiRegion: trail.IsMultiRegionTrail,
      isLogging: status.IsLogging,
      hasLogFileValidation: trail.LogFileValidationEnabled,
      s3Bucket: trail.S3BucketName,
    });
  }

  const recommendations = [];
  if (!multiRegionTrail) recommendations.push('Enable multi-region trail for comprehensive coverage');
  if (!loggingEnabled) recommendations.push('Ensure at least one trail has logging enabled');

  let status = 'pass';
  if (!loggingEnabled) status = 'fail';
  else if (!multiRegionTrail) status = 'partial';

  return {
    status,
    details: loggingEnabled
      ? `CloudTrail is active with ${trailList.length} trail(s)${multiRegionTrail ? ' including multi-region coverage' : ''}`
      : 'CloudTrail trails exist but logging is not enabled',
    evidence: {
      type: 'json',
      data: JSON.stringify({ trails: trailDetails }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

/**
 * Check Security Hub Status
 */
async function checkSecurityHubStatus(credentials) {
  const aws = getAWS();
  const securityhub = new aws.SecurityHub({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  try {
    const hub = await securityhub.describeHub({}).promise();

    return {
      status: 'pass',
      details: `Security Hub is enabled (subscribed on ${new Date(hub.SubscribedAt).toLocaleDateString()})`,
      evidence: {
        type: 'json',
        data: JSON.stringify({
          hubArn: hub.HubArn,
          subscribedAt: hub.SubscribedAt,
          autoEnableControls: hub.AutoEnableControls,
        }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  } catch (error) {
    if (error.code === 'InvalidAccessException' || error.message.includes('not subscribed')) {
      return {
        status: 'fail',
        details: 'AWS Security Hub is not enabled in this region',
        recommendations: [
          'Enable AWS Security Hub for centralized security findings',
          'Enable AWS Foundational Security Best Practices standard',
          'Configure findings aggregation across regions',
        ],
      };
    }
    throw error;
  }
}

/**
 * Check AWS Config Recorder Status
 */
async function checkConfigRecorder(credentials) {
  const aws = getAWS();
  const config = new aws.ConfigService({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: credentials.region || 'us-east-1',
  });

  const recorders = await config.describeConfigurationRecorders({}).promise();
  const recorderStatus = await config.describeConfigurationRecorderStatus({}).promise();

  if (!recorders.ConfigurationRecorders || recorders.ConfigurationRecorders.length === 0) {
    return {
      status: 'fail',
      details: 'AWS Config is not configured - no configuration recorders found',
      recommendations: [
        'Enable AWS Config to track resource configurations',
        'Configure Config to record all resource types',
        'Set up an S3 bucket for configuration history',
      ],
    };
  }

  const isRecording = recorderStatus.ConfigurationRecordersStatus?.some(s => s.recording);
  const recordsAllResources = recorders.ConfigurationRecorders.some(
    r => r.recordingGroup?.allSupported === true
  );

  let status = 'pass';
  const recommendations = [];

  if (!isRecording) {
    status = 'fail';
    recommendations.push('Start the configuration recorder');
  } else if (!recordsAllResources) {
    status = 'partial';
    recommendations.push('Configure recorder to track all supported resource types');
  }

  return {
    status,
    details: isRecording
      ? `AWS Config is recording${recordsAllResources ? ' all resource types' : ' selected resource types'}`
      : 'AWS Config recorder exists but is not recording',
    evidence: {
      type: 'json',
      data: JSON.stringify({
        recorders: recorders.ConfigurationRecorders,
        status: recorderStatus.ConfigurationRecordersStatus,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

// ============================================================================
// HANDLER
// ============================================================================

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { action, credentials, controlId, checkType } = payload;

    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'AWS credentials are required' }),
      };
    }

    // Test connection
    if (action === 'test_connection') {
      const result = await testConnection(credentials);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Verify control
    if (action === 'verify_control') {
      let result;

      switch (checkType) {
        case 'mfa_status':
          result = await checkMFAStatus(credentials);
          break;
        case 'password_policy':
          result = await checkPasswordPolicy(credentials);
          break;
        case 's3_encryption':
          result = await checkS3Encryption(credentials);
          break;
        case 'kms_rotation':
          result = await checkKMSRotation(credentials);
          break;
        case 'cloudtrail_status':
          result = await checkCloudTrailStatus(credentials);
          break;
        case 'security_hub_status':
          result = await checkSecurityHubStatus(credentials);
          break;
        case 'config_recorder':
          result = await checkConfigRecorder(credentials);
          break;
        default:
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: `Unknown check type: ${checkType}` }),
          };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid action' }),
    };

  } catch (error) {
    console.error('AWS Verify error:', error);

    // Handle specific AWS errors
    if (error.code === 'InvalidClientTokenId' || error.code === 'SignatureDoesNotMatch') {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid AWS credentials' }),
      };
    }

    if (error.code === 'AccessDenied' || error.code === 'UnauthorizedAccess') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Access denied. Ensure your IAM credentials have the required permissions.',
        }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Verification failed',
        message: error.message,
      }),
    };
  }
};
