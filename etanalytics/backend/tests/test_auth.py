"""
Authentication endpoint tests
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestAuthRegister:
    """Tests for /auth/register endpoint"""
    
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration"""
        response = await client.post("/auth/register", json={
            "email": "newuser@example.com",
            "password": "NewUser123!",
            "name": "New User"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["name"] == "New User"
        assert data["role"] == "issuer"
        assert "password" not in data
    
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """Test registration with existing email"""
        response = await client.post("/auth/register", json={
            "email": test_user.email,
            "password": "Test123!",
            "name": "Duplicate User"
        })
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email"""
        response = await client.post("/auth/register", json={
            "email": "not-an-email",
            "password": "Test123!",
            "name": "Invalid Email"
        })
        
        assert response.status_code == 422


class TestAuthLogin:
    """Tests for /auth/login endpoint"""
    
    async def test_login_success(self, client: AsyncClient, test_user):
        """Test successful login"""
        response = await client.post("/auth/login", json={
            "email": test_user.email,
            "password": "Test123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    async def test_login_wrong_password(self, client: AsyncClient, test_user):
        """Test login with wrong password"""
        response = await client.post("/auth/login", json={
            "email": test_user.email,
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent email"""
        response = await client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "Test123!"
        })
        
        assert response.status_code == 401


class TestAuthMe:
    """Tests for /auth/me endpoint"""
    
    async def test_get_me_authenticated(self, client: AsyncClient, test_user, auth_headers):
        """Test getting current user info when authenticated"""
        response = await client.get("/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
        assert data["role"] == test_user.role
    
    async def test_get_me_unauthenticated(self, client: AsyncClient):
        """Test getting current user info without auth"""
        response = await client.get("/auth/me")
        
        assert response.status_code == 401


class TestAuthRefresh:
    """Tests for /auth/refresh endpoint"""
    
    async def test_refresh_token(self, client: AsyncClient, test_user):
        """Test refreshing access token"""
        # First login to get tokens
        login_response = await client.post("/auth/login", json={
            "email": test_user.email,
            "password": "Test123!"
        })
        
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Refresh the token
        response = await client.post("/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    async def test_refresh_invalid_token(self, client: AsyncClient):
        """Test refresh with invalid token"""
        response = await client.post("/auth/refresh", json={
            "refresh_token": "invalid_token"
        })
        
        assert response.status_code == 401


class TestAuthLogout:
    """Tests for /auth/logout endpoint"""
    
    async def test_logout(self, client: AsyncClient, auth_headers):
        """Test logout"""
        response = await client.post("/auth/logout", headers=auth_headers)
        
        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()


class TestAuthVerify:
    """Tests for /auth/verify endpoint"""
    
    async def test_verify_valid_token(self, client: AsyncClient, test_user, auth_headers):
        """Test verifying valid token"""
        response = await client.get("/auth/verify", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["user_id"] == test_user.id
        assert data["email"] == test_user.email
    
    async def test_verify_invalid_token(self, client: AsyncClient):
        """Test verifying invalid token"""
        response = await client.get("/auth/verify", headers={
            "Authorization": "Bearer invalid_token"
        })
        
        assert response.status_code == 401



