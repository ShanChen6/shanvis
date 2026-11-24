-- Sample catalog for local development (`supabase db reset`).
-- Prices are indicative VND retail prices, not live pricing.

insert into public.products (slug, name, brand, category, price, stock, description) values
  ('sony-a7-iv',            'Sony Alpha a7 IV',            'sony',     'body', 52990000, 8,  '33MP full-frame hybrid with 4K60 10-bit and 5.5-stop IBIS.'),
  ('sony-zv-e10-ii',        'Sony ZV-E10 II',              'sony',     'body', 24990000, 12, 'Compact APS-C vlogging body with 4K60 and a flip-out screen.'),
  ('canon-eos-r6-mark-ii',  'Canon EOS R6 Mark II',        'canon',    'body', 56990000, 5,  '24MP full-frame with class-leading low-light AF and 8-stop IBIS.'),
  ('fujifilm-x100vi',       'Fujifilm X100VI',             'fujifilm', 'body', 44990000, 3,  'Fixed 23mm f/2 street camera with 40MP X-Trans and film simulations.'),
  ('fujifilm-x-t5',         'Fujifilm X-T5',               'fujifilm', 'body', 41990000, 6,  '40MP APS-C with classic dials and 7-stop IBIS.'),
  ('nikon-z6-iii',          'Nikon Z6III',                 'nikon',    'body', 57990000, 4,  'Partially stacked 24MP full-frame with 6K RAW video.'),
  ('sony-fe-35mm-f1-8',     'Sony FE 35mm f/1.8',          'sony',     'lens', 12490000, 10, 'Light everyday full-frame prime.'),
  ('sony-fe-24-70mm-f2-8-gm-ii', 'Sony FE 24-70mm f/2.8 GM II', 'sony', 'lens', 52990000, 2,  'Flagship standard zoom, 695 g.'),
  ('sigma-18-50mm-f2-8-dc-dn-e', 'Sigma 18-50mm f/2.8 DC DN (E)', 'sigma', 'lens', 13990000, 9, 'Tiny constant f/2.8 APS-C zoom, ideal for vlogging.'),
  ('canon-rf-50mm-f1-8-stm', 'Canon RF 50mm f/1.8 STM',    'canon',    'lens', 5490000,  15, 'The nifty fifty for RF.'),
  ('fujifilm-xf-23mm-f1-4-r-lm-wr', 'Fujifilm XF 23mm f/1.4 R LM WR', 'fujifilm', 'lens', 22990000, 4, 'Fast weather-sealed 35mm-equivalent prime.'),
  ('nikon-z-24-120mm-f4-s', 'Nikon Z 24-120mm f/4 S',      'nikon',    'lens', 27990000, 3,  'Versatile S-line travel zoom.'),
  ('peak-design-slide-lite', 'Peak Design Slide Lite',     'peak-design', 'accessory', 1990000, 20, 'Quick-connect camera sling strap.'),
  ('sony-np-fz100',         'Sony NP-FZ100 Battery',       'sony',     'accessory', 2190000, 25, 'Z-series battery for Sony Alpha bodies.');

insert into public.camera_specs (product_id, specs)
select p.id, v.specs::jsonb
from (values
  ('sony-a7-iv',           '{"kind":"body","mount_type":"sony-e","sensor_size":"full-frame","megapixels":33,"iso_min":100,"iso_max":51200,"ibis_stops":5.5,"video_max":"4K60 10-bit","weight_g":658}'),
  ('sony-zv-e10-ii',       '{"kind":"body","mount_type":"sony-e","sensor_size":"aps-c","megapixels":26,"iso_min":100,"iso_max":32000,"ibis_stops":null,"video_max":"4K60 10-bit","weight_g":377}'),
  ('canon-eos-r6-mark-ii', '{"kind":"body","mount_type":"canon-rf","sensor_size":"full-frame","megapixels":24.2,"iso_min":100,"iso_max":102400,"ibis_stops":8,"video_max":"4K60 10-bit","weight_g":670}'),
  ('fujifilm-x100vi',      '{"kind":"body","mount_type":"fujifilm-x","sensor_size":"aps-c","megapixels":40.2,"iso_min":125,"iso_max":12800,"ibis_stops":6,"video_max":"6.2K30","weight_g":521,"fixed_lens":"23mm f/2"}'),
  ('fujifilm-x-t5',        '{"kind":"body","mount_type":"fujifilm-x","sensor_size":"aps-c","megapixels":40.2,"iso_min":125,"iso_max":12800,"ibis_stops":7,"video_max":"6.2K30","weight_g":557}'),
  ('nikon-z6-iii',         '{"kind":"body","mount_type":"nikon-z","sensor_size":"full-frame","megapixels":24.5,"iso_min":100,"iso_max":64000,"ibis_stops":8,"video_max":"6K60 RAW","weight_g":760}'),
  ('sony-fe-35mm-f1-8',    '{"kind":"lens","mount_type":"sony-e","sensor_coverage":"full-frame","focal_min_mm":35,"focal_max_mm":35,"aperture_max":1.8,"aperture_min":22,"ois":false,"weight_g":280}'),
  ('sony-fe-24-70mm-f2-8-gm-ii', '{"kind":"lens","mount_type":"sony-e","sensor_coverage":"full-frame","focal_min_mm":24,"focal_max_mm":70,"aperture_max":2.8,"aperture_min":22,"ois":false,"weight_g":695}'),
  ('sigma-18-50mm-f2-8-dc-dn-e', '{"kind":"lens","mount_type":"sony-e","sensor_coverage":"aps-c","focal_min_mm":18,"focal_max_mm":50,"aperture_max":2.8,"aperture_min":22,"ois":false,"weight_g":290}'),
  ('canon-rf-50mm-f1-8-stm', '{"kind":"lens","mount_type":"canon-rf","sensor_coverage":"full-frame","focal_min_mm":50,"focal_max_mm":50,"aperture_max":1.8,"aperture_min":22,"ois":false,"weight_g":160}'),
  ('fujifilm-xf-23mm-f1-4-r-lm-wr', '{"kind":"lens","mount_type":"fujifilm-x","sensor_coverage":"aps-c","focal_min_mm":23,"focal_max_mm":23,"aperture_max":1.4,"aperture_min":16,"ois":false,"weight_g":375}'),
  ('nikon-z-24-120mm-f4-s', '{"kind":"lens","mount_type":"nikon-z","sensor_coverage":"full-frame","focal_min_mm":24,"focal_max_mm":120,"aperture_max":4,"aperture_min":22,"ois":false,"weight_g":630}'),
  ('peak-design-slide-lite', '{"kind":"accessory","compatible_mounts":[],"type":"strap"}'),
  ('sony-np-fz100',        '{"kind":"accessory","compatible_mounts":["sony-e"],"type":"battery","capacity_mah":2280}')
) as v(slug, specs)
join public.products p on p.slug = v.slug;
