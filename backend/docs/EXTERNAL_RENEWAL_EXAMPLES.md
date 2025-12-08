# External Renewal API - Usage Examples

This document provides practical examples for integrating with the External Renewal API.

## Table of Contents
- [Quick Start](#quick-start)
- [JavaScript/Node.js Examples](#javascriptnodejs-examples)
- [Python Examples](#python-examples)
- [PHP Examples](#php-examples)
- [C# Examples](#c-examples)
- [Java Examples](#java-examples)
- [Error Handling](#error-handling)

## Quick Start

### Basic cURL Request

```bash
curl -X POST http://localhost:5000/api/external-renewal/renew \
  -H "Content-Type: application/json" \
  -d '{
    "id_number": "9001015800084",
    "renewal_period_months": 12,
    "payment_reference": "PAY-2024-001",
    "payment_method": "online",
    "amount_paid": 120.00
  }'
```

## JavaScript/Node.js Examples

### Using Axios

```javascript
const axios = require('axios');

async function renewMembership(idNumber, options = {}) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/external-renewal/renew',
      {
        id_number: idNumber,
        renewal_period_months: options.months || 12,
        payment_reference: options.paymentRef,
        payment_method: options.method || 'external_system',
        amount_paid: options.amount,
        notes: options.notes,
        external_system_id: options.externalId
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Usage
(async () => {
  const result = await renewMembership('9001015800084', {
    months: 12,
    paymentRef: 'PAY-2024-001',
    method: 'online',
    amount: 120.00,
    notes: 'Annual renewal',
    externalId: 'EXT-12345'
  });

  if (result.success) {
    console.log('Renewal successful!');
    console.log('New expiry date:', result.data.data.renewal_details.new_expiry_date);
    console.log('Member status:', result.data.data.membership.membership_status_name);
  } else {
    console.error('Renewal failed:', result.error);
  }
})();
```

### Using Fetch API

```javascript
async function renewMembership(idNumber, renewalData) {
  try {
    const response = await fetch('http://localhost:5000/api/external-renewal/renew', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id_number: idNumber,
        ...renewalData
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Renewal failed');
    }
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Usage
renewMembership(12345, {
  renewal_period_months: 12,
  payment_reference: 'PAY-2024-001',
  payment_method: 'online',
  amount_paid: 120.00
})
.then(result => {
  console.log('Success:', result.data.renewal_details);
})
.catch(error => {
  console.error('Failed:', error);
});
```

## Python Examples

### Using Requests Library

```python
import requests
import json
from typing import Dict, Optional

class MembershipRenewalClient:
    def __init__(self, base_url: str = 'http://localhost:5000/api'):
        self.base_url = base_url
        self.endpoint = f'{base_url}/external-renewal/renew'
    
    def renew_membership(
        self,
        id_number: str,
        renewal_period_months: int = 12,
        payment_reference: Optional[str] = None,
        payment_method: str = 'external_system',
        amount_paid: Optional[float] = None,
        notes: Optional[str] = None,
        external_system_id: Optional[str] = None
    ) -> Dict:
        """
        Renew a membership and return complete membership data.

        Args:
            id_number: The member's South African ID number (13 digits)
            renewal_period_months: Number of months to extend (1-60)
            payment_reference: External payment reference
            payment_method: Payment method used
            amount_paid: Amount paid for renewal
            notes: Additional notes
            external_system_id: External system identifier

        Returns:
            Dict containing renewal details and membership data

        Raises:
            requests.exceptions.RequestException: If the request fails
        """
        payload = {
            'id_number': id_number,
            'renewal_period_months': renewal_period_months
        }
        
        # Add optional parameters
        if payment_reference:
            payload['payment_reference'] = payment_reference
        if payment_method:
            payload['payment_method'] = payment_method
        if amount_paid is not None:
            payload['amount_paid'] = amount_paid
        if notes:
            payload['notes'] = notes
        if external_system_id:
            payload['external_system_id'] = external_system_id
        
        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response else {}
            raise Exception(f"Renewal failed: {error_data.get('error', {}).get('message', str(e))}")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")

# Usage
if __name__ == '__main__':
    client = MembershipRenewalClient()
    
    try:
        result = client.renew_membership(
            id_number='9001015800084',
            renewal_period_months=12,
            payment_reference='PAY-2024-001',
            payment_method='online',
            amount_paid=120.00,
            notes='Annual renewal via external system'
        )
        
        print('Renewal successful!')
        print(f"Member: {result['data']['membership']['full_name']}")
        print(f"New expiry: {result['data']['renewal_details']['new_expiry_date']}")
        print(f"Status: {result['data']['membership']['membership_status_name']}")
        
    except Exception as e:
        print(f'Error: {e}')
```

## PHP Examples

### Using cURL

```php
<?php

class MembershipRenewalClient {
    private $baseUrl;
    private $endpoint;
    
    public function __construct($baseUrl = 'http://localhost:5000/api') {
        $this->baseUrl = $baseUrl;
        $this->endpoint = $baseUrl . '/external-renewal/renew';
    }
    
    public function renewMembership($idNumber, $options = []) {
        $payload = array_merge([
            'id_number' => $idNumber,
            'renewal_period_months' => 12
        ], $options);
        
        $ch = curl_init($this->endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if ($httpCode !== 200) {
            throw new Exception($data['error']['message'] ?? 'Renewal failed');
        }
        
        return $data;
    }
}

// Usage
try {
    $client = new MembershipRenewalClient();
    
    $result = $client->renewMembership(12345, [
        'renewal_period_months' => 12,
        'payment_reference' => 'PAY-2024-001',
        'payment_method' => 'online',
        'amount_paid' => 120.00,
        'notes' => 'Annual renewal'
    ]);
    
    echo "Renewal successful!\n";
    echo "Member: " . $result['data']['membership']['full_name'] . "\n";
    echo "New expiry: " . $result['data']['renewal_details']['new_expiry_date'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

## C# Examples

### Using HttpClient

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class MembershipRenewalClient
{
    private readonly HttpClient _httpClient;
    private readonly string _endpoint;
    
    public MembershipRenewalClient(string baseUrl = "http://localhost:5000/api")
    {
        _httpClient = new HttpClient();
        _endpoint = $"{baseUrl}/external-renewal/renew";
    }
    
    public async Task<RenewalResponse> RenewMembershipAsync(RenewalRequest request)
    {
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(_endpoint, content);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Renewal failed: {responseContent}");
        }
        
        return JsonSerializer.Deserialize<RenewalResponse>(responseContent);
    }
}

public class RenewalRequest
{
    public string id_number { get; set; }
    public int renewal_period_months { get; set; } = 12;
    public string payment_reference { get; set; }
    public string payment_method { get; set; } = "external_system";
    public decimal? amount_paid { get; set; }
    public string notes { get; set; }
    public string external_system_id { get; set; }
}

public class RenewalResponse
{
    public bool success { get; set; }
    public string message { get; set; }
    public RenewalData data { get; set; }
}

public class RenewalData
{
    public RenewalDetails renewal_details { get; set; }
    public Membership membership { get; set; }
}

// Usage
class Program
{
    static async Task Main(string[] args)
    {
        var client = new MembershipRenewalClient();
        
        try
        {
            var request = new RenewalRequest
            {
                id_number = "9001015800084",
                renewal_period_months = 12,
                payment_reference = "PAY-2024-001",
                payment_method = "online",
                amount_paid = 120.00m,
                notes = "Annual renewal"
            };
            
            var result = await client.RenewMembershipAsync(request);
            
            Console.WriteLine("Renewal successful!");
            Console.WriteLine($"Member: {result.data.membership.full_name}");
            Console.WriteLine($"New expiry: {result.data.renewal_details.new_expiry_date}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
```

## Java Examples

### Using HttpURLConnection

```java
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

public class MembershipRenewalClient {
    private String baseUrl;
    private String endpoint;
    
    public MembershipRenewalClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.endpoint = baseUrl + "/external-renewal/renew";
    }
    
    public JSONObject renewMembership(String idNumber, JSONObject options) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("id_number", idNumber);
        payload.put("renewal_period_months", options.optInt("renewal_period_months", 12));
        
        if (options.has("payment_reference")) {
            payload.put("payment_reference", options.getString("payment_reference"));
        }
        if (options.has("payment_method")) {
            payload.put("payment_method", options.getString("payment_method"));
        }
        if (options.has("amount_paid")) {
            payload.put("amount_paid", options.getDouble("amount_paid"));
        }
        
        URL url = new URL(endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        
        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = payload.toString().getBytes("utf-8");
            os.write(input, 0, input.length);
        }
        
        int responseCode = conn.getResponseCode();
        BufferedReader br = new BufferedReader(
            new InputStreamReader(
                responseCode == 200 ? conn.getInputStream() : conn.getErrorStream(),
                "utf-8"
            )
        );
        
        StringBuilder response = new StringBuilder();
        String responseLine;
        while ((responseLine = br.readLine()) != null) {
            response.append(responseLine.trim());
        }
        
        JSONObject result = new JSONObject(response.toString());
        
        if (responseCode != 200) {
            throw new Exception("Renewal failed: " + result.optJSONObject("error").optString("message"));
        }
        
        return result;
    }
    
    public static void main(String[] args) {
        try {
            MembershipRenewalClient client = new MembershipRenewalClient("http://localhost:5000/api");
            
            JSONObject options = new JSONObject();
            options.put("renewal_period_months", 12);
            options.put("payment_reference", "PAY-2024-001");
            options.put("payment_method", "online");
            options.put("amount_paid", 120.00);
            
            JSONObject result = client.renewMembership(12345, options);
            
            System.out.println("Renewal successful!");
            System.out.println("New expiry: " + 
                result.getJSONObject("data")
                      .getJSONObject("renewal_details")
                      .getString("new_expiry_date"));
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
```

## Error Handling

### Handling Different Error Types

```javascript
async function renewWithErrorHandling(memberId, options) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/external-renewal/renew',
      { id_number: idNumber, ...options }
    );
    
    return {
      success: true,
      data: response.data
    };
    
  } catch (error) {
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const errorData = error.response.data;
      
      switch (status) {
        case 404:
          return {
            success: false,
            error: 'MEMBER_NOT_FOUND',
            message: `Member with ID ${memberId} not found`
          };
          
        case 400:
          return {
            success: false,
            error: 'VALIDATION_ERROR',
            message: errorData.error?.message || 'Invalid request data'
          };
          
        case 500:
          return {
            success: false,
            error: 'SERVER_ERROR',
            message: 'Internal server error. Please try again later.'
          };
          
        default:
          return {
            success: false,
            error: 'UNKNOWN_ERROR',
            message: errorData.error?.message || 'An unexpected error occurred'
          };
      }
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to the server'
      };
    } else {
      // Error in request setup
      return {
        success: false,
        error: 'REQUEST_ERROR',
        message: error.message
      };
    }
  }
}
```

## Best Practices

1. **Always validate id_number before making the request** (must be 13-digit South African ID)
2. **Implement retry logic for network failures**
3. **Log all renewal attempts for audit purposes**
4. **Handle errors gracefully and provide user feedback**
5. **Use environment variables for API endpoints**
6. **Implement timeout handling for long-running requests**
7. **Cache member data when appropriate**
8. **Validate response data before using it**

## Support

For more information, see:
- [External Renewal API Documentation](./EXTERNAL_RENEWAL_API.md)
- [Main API Documentation](../API_DOCUMENTATION.md)

