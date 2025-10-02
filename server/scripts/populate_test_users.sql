-- SQL script to populate test users in the database
-- This creates the test users based on the provided environment variables

-- Insert test users
INSERT INTO users (id, email, name, role, created_at, updated_at, is_active) VALUES
(gen_random_uuid(), 'student1@example.com', 'Student One', 'student', NOW(), NOW(), true),
(gen_random_uuid(), 'student2@example.com', 'Student Two', 'student', NOW(), NOW(), true),
(gen_random_uuid(), 'student3@example.com', 'Student Three', 'student', NOW(), NOW(), true),
(gen_random_uuid(), 'student4@example.com', 'Student Four', 'student', NOW(), NOW(), true),
(gen_random_uuid(), 'student5@example.com', 'Student Five', 'student', NOW(), NOW(), true),
(gen_random_uuid(), 'instructor1@example.com', 'Instructor One', 'instructor', NOW(), NOW(), true)
ON CONFLICT (email) DO NOTHING;

-- Display the created users
SELECT 
    id,
    email,
    name,
    role,
    created_at,
    is_active
FROM users 
WHERE email IN (
    'student1@example.com',
    'student2@example.com', 
    'student3@example.com',
    'student4@example.com',
    'student5@example.com',
    'instructor1@example.com'
)
ORDER BY role, email;