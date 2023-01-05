local name = arg[1]

local main_fname = name .. ".main.html"
local main_file = io.open(main_fname, 'r')
local main = main_file:read("*all")
main_file:close()

local extra_args = dofile(name .. ".args.lua")

local template_fname = "./html/html.template.html"
local template_file = io.open(template_fname, 'r')
local template = template_file:read("*all")
template_file:close()
--print(template)

function replacer(x)
   if x == "main" then
      return main
   end
   local res = extra_args[x]
   if res then
      return res
   end
   print('not found', x)
   return ''
end
local result = string.gsub(template, "{{(%g*)}}", replacer)

local output_fname = name .. ".html"
local output_file = io.open(output_fname, 'w')
output_file:write(result)
output_file:close()
