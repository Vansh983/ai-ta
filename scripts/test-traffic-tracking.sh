#!/bin/bash

echo "🚀 Testing AI Teaching Assistant Traffic Tracking System"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if service is ready
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}📡 Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ Attempt $attempt/$max_attempts - waiting for $service_name...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Function to test API endpoint
test_api_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    local data=$4
    
    echo -e "${BLUE}🧪 Testing: $description${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "HTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X "$method" "$url" -w "HTTP_STATUS:%{http_code}")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo -e "${GREEN}✅ Success ($http_code): $description${NC}"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo -e "${BLUE}📋 Response:${NC} $(echo "$body" | jq . 2>/dev/null || echo "$body")"
        fi
        return 0
    else
        echo -e "${RED}❌ Failed ($http_code): $description${NC}"
        echo -e "${RED}📋 Response:${NC} $body"
        return 1
    fi
}

# Function to simulate frontend traffic
simulate_traffic() {
    local base_url=$1
    local session_id="test_session_$(date +%s)"
    
    echo -e "${BLUE}🌐 Simulating frontend traffic with session: $session_id${NC}"
    
    # Simulate various page visits
    local pages=(
        '{"page_name": "home", "page_url": "http://localhost:3001/", "session_id": "'$session_id'", "referrer": "", "screen_resolution": "1920x1080", "meta_data": {"test": true}}'
        '{"page_name": "instructor-dashboard", "page_url": "http://localhost:3001/instructor", "session_id": "'$session_id'", "referrer": "http://localhost:3001/", "screen_resolution": "1920x1080", "time_on_page": 5000}'
        '{"page_name": "course-detail", "page_url": "http://localhost:3001/instructor/course123", "session_id": "'$session_id'", "referrer": "http://localhost:3001/instructor", "screen_resolution": "1920x1080", "time_on_page": 15000}'
        '{"page_name": "student-view", "page_url": "http://localhost:3001/student", "session_id": "'$session_id'", "referrer": "http://localhost:3001/", "screen_resolution": "1280x720", "time_on_page": 30000}'
    )
    
    local success_count=0
    for page_data in "${pages[@]}"; do
        if test_api_endpoint "POST" "$base_url/track" "Track page visit" "$page_data"; then
            ((success_count++))
        fi
        sleep 1  # Small delay between requests
    done
    
    echo -e "${GREEN}📊 Successfully tracked $success_count/${#pages[@]} page visits${NC}"
    return $success_count
}

# Main execution
main() {
    echo -e "${BLUE}🧹 Cleaning up any existing test containers...${NC}"
    docker-compose -f docker-compose.test.yml down -v > /dev/null 2>&1
    
    echo -e "${BLUE}🔨 Starting test environment...${NC}"
    if ! docker-compose -f docker-compose.test.yml up -d; then
        echo -e "${RED}❌ Failed to start test environment${NC}"
        exit 1
    fi
    
    # Wait for services to be ready
    if ! check_service "http://localhost:8001/health" "Backend API"; then
        echo -e "${RED}❌ Backend API failed to start${NC}"
        docker-compose -f docker-compose.test.yml logs server
        exit 1
    fi
    
    if ! check_service "http://localhost:3001" "Frontend Client"; then
        echo -e "${RED}❌ Frontend client failed to start${NC}"
        docker-compose -f docker-compose.test.yml logs client
        exit 1
    fi
    
    echo -e "${GREEN}🎉 All services are running!${NC}"
    echo ""
    
    # Test basic API endpoints
    echo -e "${YELLOW}=== Testing Basic API Endpoints ===${NC}"
    test_api_endpoint "GET" "http://localhost:8001/" "Root endpoint"
    test_api_endpoint "GET" "http://localhost:8001/health" "Health check"
    
    echo ""
    
    # Test traffic tracking
    echo -e "${YELLOW}=== Testing Traffic Tracking ===${NC}"
    if simulate_traffic "http://localhost:8001"; then
        echo -e "${GREEN}✅ Traffic simulation completed successfully${NC}"
    else
        echo -e "${RED}❌ Traffic simulation had some failures${NC}"
    fi
    
    echo ""
    
    # Test analytics endpoint
    echo -e "${YELLOW}=== Testing Analytics Endpoints ===${NC}"
    test_api_endpoint "GET" "http://localhost:8001/analytics/traffic" "Get traffic analytics (default)"
    test_api_endpoint "GET" "http://localhost:8001/analytics/traffic?page_name=home" "Get traffic analytics for home page"
    
    echo ""
    
    # Show service URLs
    echo -e "${YELLOW}=== Service URLs ===${NC}"
    echo -e "${GREEN}🌐 Frontend:${NC} http://localhost:3001"
    echo -e "${GREEN}🔧 Backend API:${NC} http://localhost:8001"
    echo -e "${GREEN}📊 API Docs:${NC} http://localhost:8001/docs"
    echo -e "${GREEN}📈 Analytics Dashboard:${NC} http://localhost:3002"
    
    echo ""
    echo -e "${BLUE}📋 View traffic data with:${NC}"
    echo "curl -s http://localhost:8001/analytics/traffic | jq ."
    
    echo ""
    echo -e "${YELLOW}💡 The system is now ready for testing!${NC}"
    echo -e "${BLUE}   - Visit http://localhost:3001 to see the frontend with traffic tracking${NC}"
    echo -e "${BLUE}   - Check http://localhost:8001/analytics/traffic for traffic data${NC}"
    echo -e "${BLUE}   - Use 'docker-compose -f docker-compose.test.yml logs -f' to watch logs${NC}"
    echo -e "${BLUE}   - Use 'docker-compose -f docker-compose.test.yml down -v' to clean up${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 Traffic tracking system test completed successfully!${NC}"
}

# Run the main function
main "$@"