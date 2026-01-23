"""
Application endpoint tests
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestApplicationCreate:
    """Tests for POST /api/applications endpoint"""
    
    async def test_create_application_success(self, client: AsyncClient):
        """Test successful application submission"""
        response = await client.post("/api/applications", json={
            "company_name": "Test Company Ltd",
            "registration_number": "12345678",
            "contact_name": "John Doe",
            "contact_email": "john@testcompany.com",
            "contact_phone": "+44 123 456 7890",
            "country": "United Kingdom",
            "selected_plan": "professional",
            "num_etfs": 5
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Test Company Ltd"
        assert data["status"] == "new"
        assert "access_token" in data
    
    async def test_create_application_invalid_plan(self, client: AsyncClient):
        """Test application with invalid plan"""
        response = await client.post("/api/applications", json={
            "company_name": "Test Company",
            "registration_number": "12345678",
            "contact_name": "John Doe",
            "contact_email": "john@test.com",
            "contact_phone": "+44 123",
            "country": "UK",
            "selected_plan": "invalid_plan"
        })
        
        assert response.status_code == 400
        assert "invalid plan" in response.json()["detail"].lower()


class TestApplicationsList:
    """Tests for GET /api/applications endpoint"""
    
    async def test_list_applications_admin(self, client: AsyncClient, admin_auth_headers):
        """Test listing applications as admin"""
        # Create an application first
        await client.post("/api/applications", json={
            "company_name": "Test Company",
            "registration_number": "12345678",
            "contact_name": "John",
            "contact_email": "john@test.com",
            "contact_phone": "+44 123",
            "country": "UK",
            "selected_plan": "starter"
        })
        
        response = await client.get("/api/applications", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    async def test_list_applications_unauthorized(self, client: AsyncClient, auth_headers):
        """Test listing applications as regular user (should fail)"""
        response = await client.get("/api/applications", headers=auth_headers)
        
        assert response.status_code == 403


class TestApplicationStatus:
    """Tests for GET /api/applications/status/{token} endpoint"""
    
    async def test_get_application_by_token(self, client: AsyncClient):
        """Test getting application by access token"""
        # Create application
        create_response = await client.post("/api/applications", json={
            "company_name": "Token Test Company",
            "registration_number": "99999999",
            "contact_name": "Jane",
            "contact_email": "jane@test.com",
            "contact_phone": "+44 999",
            "country": "UK",
            "selected_plan": "enterprise"
        })
        
        token = create_response.json()["access_token"]
        
        # Get by token
        response = await client.get(f"/api/applications/status/{token}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Token Test Company"
    
    async def test_get_application_invalid_token(self, client: AsyncClient):
        """Test getting application with invalid token"""
        response = await client.get("/api/applications/status/invalid_token")
        
        assert response.status_code == 404


class TestApplicationUpdate:
    """Tests for PATCH /api/applications/{id} endpoint"""
    
    async def test_update_application_status(self, client: AsyncClient, admin_auth_headers):
        """Test updating application status as admin"""
        # Create application
        create_response = await client.post("/api/applications", json={
            "company_name": "Update Test",
            "registration_number": "11111111",
            "contact_name": "Bob",
            "contact_email": "bob@test.com",
            "contact_phone": "+44 111",
            "country": "UK",
            "selected_plan": "professional"
        })
        
        app_id = create_response.json()["id"]
        
        # Update status
        response = await client.patch(
            f"/api/applications/{app_id}",
            json={"status": "contract_sent"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "contract_sent"
    
    async def test_update_application_invalid_status(self, client: AsyncClient, admin_auth_headers):
        """Test updating application with invalid status"""
        # Create application
        create_response = await client.post("/api/applications", json={
            "company_name": "Status Test",
            "registration_number": "22222222",
            "contact_name": "Alice",
            "contact_email": "alice@test.com",
            "contact_phone": "+44 222",
            "country": "UK",
            "selected_plan": "starter"
        })
        
        app_id = create_response.json()["id"]
        
        # Try invalid status
        response = await client.patch(
            f"/api/applications/{app_id}",
            json={"status": "invalid_status"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 400


class TestPipelineStats:
    """Tests for GET /api/applications/pipeline/stats endpoint"""
    
    async def test_get_pipeline_stats(self, client: AsyncClient, admin_auth_headers):
        """Test getting pipeline statistics"""
        response = await client.get("/api/applications/pipeline/stats", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "by_status" in data
        assert "by_plan" in data
        assert "total" in data



