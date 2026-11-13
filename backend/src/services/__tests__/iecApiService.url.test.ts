jest.mock('../prismaService', () => ({
  getPrisma: jest.fn(() => ({})),
}));

import { buildIecVoterUrl, DEFAULT_IEC_PROXY_URL } from '../iecApiService';

describe('buildIecVoterUrl', () => {
  const testId = '0312050173086';
  const lambdaBase = 'https://xdohhgnwrknh4l4zardtnm5eh40xoang.lambda-url.af-south-1.on.aws';

  it('uses the default AWS Lambda Function URL when proxyUrl is empty', () => {
    // Arrange & Act
    const url = buildIecVoterUrl('', testId);

    // Assert
    expect(url).toBe(`${DEFAULT_IEC_PROXY_URL}${testId}`);
    expect(url).toBe(`${lambdaBase}/?idNumber=${testId}`);
  });

  it('appends ?idNumber= when given a bare AWS Lambda Function URL with or without trailing slash', () => {
    // Arrange & Act
    const withSlash = buildIecVoterUrl(`${lambdaBase}/`, testId);
    const withoutSlash = buildIecVoterUrl(lambdaBase, testId);

    // Assert
    expect(withSlash).toBe(`${lambdaBase}/?idNumber=${testId}`);
    expect(withoutSlash).toBe(`${lambdaBase}/?idNumber=${testId}`);
  });

  it('appends the ID directly when proxyUrl already ends with ?idNumber=', () => {
    // Arrange & Act
    const url = buildIecVoterUrl(`${lambdaBase}/?idNumber=`, testId);

    // Assert
    expect(url).toBe(`${lambdaBase}/?idNumber=${testId}`);
  });

  it('supports AWS API Gateway execute-api base URLs', () => {
    // Arrange & Act
    const url = buildIecVoterUrl(
      'https://glbg77e131.execute-api.af-south-1.amazonaws.com/prod',
      testId
    );

    // Assert
    expect(url).toBe(
      `https://glbg77e131.execute-api.af-south-1.amazonaws.com/prod/api/iec/verify-voter?idNumber=${testId}`
    );
  });

  it('preserves legacy /api/voters/:idNumber fallback for non-Lambda custom hosts', () => {
    // Arrange & Act
    const url = buildIecVoterUrl('http://197.85.7.202:5000/', testId);

    // Assert
    expect(url).toBe(`http://197.85.7.202:5000/api/voters/${testId}`);
  });
});

