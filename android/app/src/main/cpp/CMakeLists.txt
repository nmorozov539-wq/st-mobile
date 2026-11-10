# Adapted from RodneyCw1/SillyTavern-Android (AGPL-3.0),
# android/app/src/main/cpp/CMakeLists.txt. Changes: project/library names.
cmake_minimum_required(VERSION 3.22.1)
project(pocket_node)
add_library(node SHARED IMPORTED)
set_target_properties(node PROPERTIES IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libnode.so)
add_library(pocket_node SHARED node_bridge.cpp)
target_compile_features(pocket_node PRIVATE cxx_std_20)
target_include_directories(pocket_node PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/node-include)
target_link_libraries(pocket_node node log)
target_link_options(pocket_node PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")
