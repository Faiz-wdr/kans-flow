-- 1. Create a default zone (Zone 1) if it doesn't exist under the default organization
DO $$
DECLARE
    default_org_id UUID;
    zone_id UUID := '00000000-0000-0000-0000-000000000010';
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    IF default_org_id IS NOT NULL THEN
        -- Insert Zone 1 (Main Floor)
        INSERT INTO public.workspace_zones (id, organization_id, name, floor_number)
        VALUES (
            zone_id,
            default_org_id,
            'Zone 1 (Main Floor)',
            1
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Seed study spaces SS1 - SS20
        FOR i IN 1..20 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'SS' || i) THEN
                INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
                VALUES (
                    default_org_id,
                    zone_id,
                    'SS' || i,
                    'study',
                    'available',
                    '{"x": 0, "y": 0}'::jsonb
                );
            END IF;
        END LOOP;
        
        -- Seed coworking spaces CS1 - CS20
        FOR i IN 1..20 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'CS' || i) THEN
                INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
                VALUES (
                    default_org_id,
                    zone_id,
                    'CS' || i,
                    'coworking',
                    'available',
                    '{"x": 0, "y": 0}'::jsonb
                );
            END IF;
        END LOOP;
        
        -- Seed private cabins C1 - C10
        FOR i IN 1..10 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'C' || i) THEN
                INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
                VALUES (
                    default_org_id,
                    zone_id,
                    'C' || i,
                    'cabin',
                    'available',
                    '{"x": 0, "y": 0}'::jsonb
                );
            END IF;
        END LOOP;

        -- Seed rooms R1, R3, R4, R5 (categorized as cabins for layout purposes)
        IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'R1') THEN
            INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
            VALUES (default_org_id, zone_id, 'R1', 'cabin', 'available', '{"x": 0, "y": 0}'::jsonb);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'R3') THEN
            INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
            VALUES (default_org_id, zone_id, 'R3', 'cabin', 'available', '{"x": 0, "y": 0}'::jsonb);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'R4') THEN
            INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
            VALUES (default_org_id, zone_id, 'R4', 'cabin', 'available', '{"x": 0, "y": 0}'::jsonb);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.seats WHERE organization_id = default_org_id AND name = 'R5') THEN
            INSERT INTO public.seats (organization_id, zone_id, name, type, status, coordinates)
            VALUES (default_org_id, zone_id, 'R5', 'cabin', 'available', '{"x": 0, "y": 0}'::jsonb);
        END IF;
    END IF;
END $$;
